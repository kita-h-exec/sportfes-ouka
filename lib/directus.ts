import { createDirectus, rest, readItems } from '@directus/sdk';

const directus = createDirectus(process.env.NEXT_PUBLIC_DIRECTUS_URL!).with(rest());

export default directus;
