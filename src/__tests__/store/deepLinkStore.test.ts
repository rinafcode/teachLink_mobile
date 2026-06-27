import { useDeepLinkStore } from '../../store/deepLinkStore';

describe('deepLinkStore — pendingDeepLink / clearPendingLink', () => {
  beforeEach(() => {
    useDeepLinkStore.setState({
      pendingDeepLink: null,
      isHandled: false,
      deepLinkError: null,
    });
  });

  it('sets pendingDeepLink and clears isHandled on setPendingDeepLink', () => {
    useDeepLinkStore.getState().setPendingDeepLink('teachlink://course/123');
    expect(useDeepLinkStore.getState().pendingDeepLink).toBe('teachlink://course/123');
    expect(useDeepLinkStore.getState().isHandled).toBe(false);
  });

  it('clears pendingDeepLink and sets isHandled on clearPendingLink', () => {
    useDeepLinkStore.getState().setPendingDeepLink('teachlink://course/123');
    useDeepLinkStore.getState().clearPendingLink();

    expect(useDeepLinkStore.getState().pendingDeepLink).toBeNull();
    expect(useDeepLinkStore.getState().isHandled).toBe(true);
  });

  it('second foreground after clearPendingLink shows no pending link', () => {
    useDeepLinkStore.getState().setPendingDeepLink('teachlink://course/123');
    useDeepLinkStore.getState().clearPendingLink();

    // Simulate second foreground — no new link set
    const { pendingDeepLink, isHandled } = useDeepLinkStore.getState();
    expect(pendingDeepLink).toBeNull();
    expect(isHandled).toBe(true);
  });

  it('pendingDeepLink resets isHandled when a new link is set', () => {
    useDeepLinkStore.getState().setPendingDeepLink('teachlink://course/123');
    useDeepLinkStore.getState().clearPendingLink();
    useDeepLinkStore.getState().setPendingDeepLink('teachlink://course/456');

    expect(useDeepLinkStore.getState().pendingDeepLink).toBe('teachlink://course/456');
    expect(useDeepLinkStore.getState().isHandled).toBe(false);
  });
});
