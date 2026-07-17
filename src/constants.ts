export const SITE_TITLE = "Ансин";
export const SITE_DESCRIPTION =
  "Вся ваша жизнь может стать церемонией, а начало положено в практике чая";
export const BASE_IMAGE_URL = "https://storage.yandexcloud.net/ansin-static/";
export const STAGING_PREFIX = "images/staging/";

/** Set when an admin visits the dashboard; storefront uses it to show edit controls. */
export const ADMIN_STOREFRONT_FLAG_KEY = "ansin:admin";

/** Hero copy when `?category=` is set (client URL sync). */
export const CATEGORY_HERO: Record<
  string,
  { title: string; description: string }
> = {
  shu: {
    title: "Шу",
    description:
      "Глубокий и бархатистый шу пуэр — чай, который согревает и собирает за столом",
  },
  sheng: {
    title: "Шен",
    description:
      "Живой шен пуэр с горной свежестью и долгой памятью листа",
  },
  red: {
    title: "Красный",
    description:
      "Ясный и полный красный чай — мягкая крепость для спокойного дня",
  },
  "ui-oolog": {
    title: "Уишаньский Улун",
    description:
      "Минеральный уишаньский улун с характером скал и дыма",
  },
  "taiwan-oolong": {
    title: "Тайваньский Улун",
    description:
      "Цветочный и округлый тайваньский улун для неспешной беседы",
  },
  white: {
    title: "Белый",
    description:
      "Тихий и чистый белый чай — лёгкость первого касания листа",
  },
};
