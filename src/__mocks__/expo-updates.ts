export const isEmbeddedLaunch = false;

export const checkForUpdateAsync = jest.fn(async () => ({
  isAvailable: false,
  manifest: null,
}));

export const fetchUpdateAsync = jest.fn(async () => ({
  isNew: true,
  manifest: {},
}));

export const reloadAsync = jest.fn(async () => {});

export default {
  isEmbeddedLaunch,
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
};
