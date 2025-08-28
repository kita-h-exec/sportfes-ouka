#!/usr/bin/env bash
set -euo pipefail

# Directus docker-compose 用 簡易バックアップ & リストア対話スクリプト
# 目的:
#   - PostgreSQL (論理ダンプ) + uploads + extensions の取得/復元
#   - ARM/AMD 跨ぎ可 (pg_dump/pg_restore 利用)
# 特徴:
#   - docker compose のサービス/ボリューム名を環境変数で柔軟に上書き
#   - Directus コンテナを一時停止して整合性確保 (再起動自動)
#   - 標準: 個別ファイル + まとめアーカイブ (combined.tar.gz) 作成
#   - フォルダ名はタイムスタンプ (YYYYMMDD-HHMMSS) で衝突回避
#   - list / restore の非対話モード対応
# 前提:
#   - このスクリプトは どのカレントディレクトリからでも実行可 (自身のパス基準で docker-compose.yml 検出)
#   - docker compose v2 コマンド利用 ("docker compose")
# 使用例:
#   chmod +x directus-backup.sh
#   ./directus-backup.sh            # 対話メニュー
#   MODE=backup ./directus-backup.sh
#   MODE=list   ./directus-backup.sh
#   MODE=restore TARGET=backups/20250101-120000 ./directus-backup.sh
# ヘルプ:
#   MODE=help ./directus-backup.sh  # 環境変数一覧表示
# 出力構造:
#   directus/backups/<timestamp>/
#     db.dump          (pg_dump -Fc)
#     uploads.tgz
#     extensions.tgz | extensions.empty
#     meta.json        (実行時メタ情報)
#     combined.tar.gz  (CREATE_COMBINED_ARCHIVE=true の場合)
# 復元内部手順:
#   1) Postgres 起動確認 2) pg_restore 3) uploads / extensions 展開
# 安全上の注意:
#   - 本番での復元は事前に最新バックアップ取得推奨
#   - pg_restore --clean で既存オブジェクトを削除するため対象 DB 名に注意
#   - combined.tar.gz は利便性向上用で冗長; 個別ファイルも保持
# ライセンス: MIT (必要に応じて変更可)

########################################
# 設定 (必要なら環境変数で上書き)
########################################
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# docker-compose.yml の場所（環境変数 DOCKER_COMPOSE_FILE で上書き可）
COMPOSE_FILE=${DOCKER_COMPOSE_FILE:-"${SCRIPT_DIR}/docker-compose.yml"}
if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "[ERROR] docker-compose.yml が見つかりません: ${COMPOSE_FILE}" >&2
  exit 1
fi

BACKUP_DIR_ROOT=${BACKUP_DIR_ROOT:-"backups"}   # スクリプト配置ディレクトリ配下に作る相対パス
BACKUP_ROOT_ABS="${SCRIPT_DIR}/${BACKUP_DIR_ROOT}"
POSTGRES_SERVICE=${POSTGRES_SERVICE:-"postgres"}
DIRECTUS_SERVICE=${DIRECTUS_SERVICE:-"directus"}
UPLOADS_VOLUME=${UPLOADS_VOLUME:-"directus_uploads"}
EXTENSIONS_VOLUME=${EXTENSIONS_VOLUME:-"directus_extensions"}
DB_USER=${DB_USER:-"directus"}
DB_NAME=${DB_NAME:-"directus"}
# 追加: 出力後に一つの tar.gz を作るか
CREATE_COMBINED_ARCHIVE=${CREATE_COMBINED_ARCHIVE:-"true"}

########################################
# 環境変数チートシート (MODE=help でも表示)
#  DOCKER_COMPOSE_FILE      読み込む docker-compose.yml パス
#  BACKUP_DIR_ROOT          バックアップ格納ルート (既定: backups)
#  POSTGRES_SERVICE         Postgres サービス名
#  DIRECTUS_SERVICE         Directus サービス名
#  UPLOADS_VOLUME           アップロード用 Docker ボリューム名
#  EXTENSIONS_VOLUME        extensions 用 Docker ボリューム名
#  DB_USER / DB_NAME        pg_dump/pg_restore に使用する認証情報
#  CREATE_COMBINED_ARCHIVE  true で combined.tar.gz 生成 (false で無効)
#  MODE                     backup | restore | list | help (未指定でメニュー)
#  TARGET                   MODE=restore の復元対象ディレクトリ (例: backups/20250101-120000)
########################################

########################################
# ユーティリティ
########################################
log() { printf "[%s] %s\n" "$(date '+%H:%M:%S')" "$*"; }
err() { printf "[ERROR] %s\n" "$*" >&2; }
confirm() { read -r -p "$1 [y/N]: " ans; [[ ${ans,,} == y* ]]; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { err "コマンド '$1' が見つかりません"; exit 1; }; }

require_cmd docker

compose() { docker compose -f "${COMPOSE_FILE}" "$@"; }

ensure_postgres_running() {
  if ! compose ps --status running | grep -q "${POSTGRES_SERVICE}"; then
    log "Postgres(${POSTGRES_SERVICE}) を起動します..."
    compose up -d "${POSTGRES_SERVICE}"
    log "ヘルスチェック待機中..."
    # 簡易待機: 最大30秒
    for i in {1..30}; do
      if compose exec -T "${POSTGRES_SERVICE}" pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
        log "Postgres ready"
        return 0
      fi
      sleep 1
    done
    err "Postgres が起動しません"; exit 1
  fi
}

stop_directus_temporarily() {
  if compose ps --status running | grep -q "${DIRECTUS_SERVICE}"; then
    log "一時的に Directus(${DIRECTUS_SERVICE}) を停止 (整合性向上のため)"
    compose stop "${DIRECTUS_SERVICE}"
    DIRECTUS_WAS_RUNNING=1
  else
    DIRECTUS_WAS_RUNNING=0
  fi
}

restart_directus_if_needed() {
  if [[ ${DIRECTUS_WAS_RUNNING:-0} -eq 1 ]]; then
    log "Directus を再起動"
    compose start "${DIRECTUS_SERVICE}" || compose up -d "${DIRECTUS_SERVICE}"
  fi
}

backup() {
  local ts target_dir
  ts=$(date '+%Y%m%d-%H%M%S')
  target_dir_rel="${BACKUP_DIR_ROOT}/${ts}"
  target_dir_abs="${BACKUP_ROOT_ABS}/${ts}"
  mkdir -p "${target_dir_abs}"
  log "バックアップ開始: ${target_dir_rel}"

  stop_directus_temporarily
  ensure_postgres_running

  log "DB ダンプ (pg_dump -Fc)"
  if ! compose exec -T "${POSTGRES_SERVICE}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc > "${target_dir_abs}/db.dump"; then
    err "pg_dump 失敗"; restart_directus_if_needed; exit 1
  fi

  log "uploads ボリューム取得"
  docker run --rm -v "${UPLOADS_VOLUME}:/from" -v "${target_dir_abs}:/to" busybox sh -c 'cd /from && tar czf /to/uploads.tgz .'

  # extensions ボリュームが空/未使用ならサイズ 0 になる場合あり
  log "extensions ボリューム取得 (存在すれば)"
  docker run --rm -v "${EXTENSIONS_VOLUME}:/from" -v "${target_dir_abs}:/to" busybox sh -c 'cd /from && if [ "$(ls -A . 2>/dev/null)" ]; then tar czf /to/extensions.tgz .; else echo "(empty)" > /to/extensions.empty; fi'

  log "メタ情報保存"
  cat > "${target_dir_abs}/meta.json" <<META
{
  "timestamp": "${ts}",
  "db_name": "${DB_NAME}",
  "db_user": "${DB_USER}",
  "postgres_service": "${POSTGRES_SERVICE}",
  "directus_service": "${DIRECTUS_SERVICE}",
  "uploads_volume": "${UPLOADS_VOLUME}",
  "extensions_volume": "${EXTENSIONS_VOLUME}",
  "compose_file": "docker-compose.yml",
  "arch": "$(uname -m)",
  "docker_image_directus": "$(compose images --format json 2>/dev/null | grep -i ${DIRECTUS_SERVICE} || true)"
}
META

  if [[ ${CREATE_COMBINED_ARCHIVE} == "true" ]]; then
    log "まとめアーカイブ作成 combined.tar.gz"
    (cd "${target_dir_abs}" && tar czf combined.tar.gz db.dump uploads.tgz extensions.tgz 2>/dev/null || true)
  fi

  restart_directus_if_needed
  log "バックアップ完了: ${target_dir_rel}"
  echo "${target_dir_rel}" > "${BACKUP_ROOT_ABS}/latest.txt"
}

list_backups() {
  if [[ ! -d ${BACKUP_ROOT_ABS} ]]; then
    echo "(バックアップ無し)"; return 0
  fi
  find "${BACKUP_ROOT_ABS}" -maxdepth 1 -mindepth 1 -type d | sed "s|${BACKUP_ROOT_ABS}/|${BACKUP_DIR_ROOT}/|" | sort
  if [[ -f ${BACKUP_ROOT_ABS}/latest.txt ]]; then
    echo "---"; echo "latest => $(cat ${BACKUP_ROOT_ABS}/latest.txt)"; fi
}

restore() {
  local target=${1:-}
  if [[ -z ${target} ]]; then
    echo "復元するバックアップディレクトリを入力 (list で確認可):"; read -r target
  fi
  # 相対 (backups/XXXX) の場合スクリプト基準に解決
  if [[ ! ${target} = /* ]]; then
    target="${SCRIPT_DIR}/${target}"
  fi
  if [[ ! -d ${target} ]]; then err "ディレクトリが存在しません: ${target}"; exit 1; fi

  log "復元対象: ${target}"
  ensure_postgres_running

  log "DB を復元 (pg_restore --clean --if-exists)"
  if [[ ! -f ${target}/db.dump ]]; then err "db.dump 無し"; exit 1; fi
  compose exec -T "${POSTGRES_SERVICE}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists < "${target}/db.dump"

  if [[ -f ${target}/uploads.tgz ]]; then
    log "uploads 展開"
    docker run --rm -v "${UPLOADS_VOLUME}:/to" -v "${target}:/from" busybox sh -c 'cd /to && tar xzf /from/uploads.tgz'
  else
    log "uploads.tgz 無し → スキップ"
  fi

  if [[ -f ${target}/extensions.tgz ]]; then
    log "extensions 展開"
    docker run --rm -v "${EXTENSIONS_VOLUME}:/to" -v "${target}:/from" busybox sh -c 'cd /to && tar xzf /from/extensions.tgz'
  else
    log "extensions.tgz 無し → スキップ"
  fi

  log "Directus コンテナ起動/再起動"
  compose up -d "${DIRECTUS_SERVICE}"
  log "復元完了"
}

menu() {
  echo "==== Directus Backup Tool ===="
  echo "1) バックアップ作成"
  echo "2) バックアップ一覧"
  echo "3) 復元"
  echo "4) ヘルプ (環境変数一覧)"
  echo "5) 終了"
  echo "=============================="
  read -r -p "選択番号: " sel
  case $sel in
    1) backup ;;
    2) list_backups ;;
    3) list_backups; read -r -p "復元するパス: " path; restore "$path" ;;
    4) print_help ;;
    5) exit 0 ;;
    *) echo "不正な選択" ;;
  esac
}

print_help() {
  cat <<HELP
--- Help / Environment Variables ---
DOCKER_COMPOSE_FILE=${DOCKER_COMPOSE_FILE:-}(override path)
BACKUP_DIR_ROOT=${BACKUP_DIR_ROOT}
POSTGRES_SERVICE=${POSTGRES_SERVICE}
DIRECTUS_SERVICE=${DIRECTUS_SERVICE}
UPLOADS_VOLUME=${UPLOADS_VOLUME}
EXTENSIONS_VOLUME=${EXTENSIONS_VOLUME}
DB_USER=${DB_USER}
DB_NAME=${DB_NAME}
CREATE_COMBINED_ARCHIVE=${CREATE_COMBINED_ARCHIVE}

例:
  CREATE_COMBINED_ARCHIVE=false MODE=backup ./directus-backup.sh
  MODE=restore TARGET=backups/20250101-120000 ./directus-backup.sh
-------------------------------------
HELP
}

main() {
  mkdir -p "${BACKUP_ROOT_ABS}"
  local mode=${MODE:-""}
  case ${mode} in
    backup) backup ;;
    restore) restore "${TARGET:-}" ;;
    list) list_backups ;;
  help) print_help ;;
    *) menu ;;
  esac
}

main "$@"
