import React from 'react';

import { ALLOW_ALL, type AclResolver } from './acl';

/**
 * Carries the resolved view permissions down to the widgets.
 *
 * A context rather than props: widgets are rendered from a handful of places but derive from a
 * common base class, so `WidgetGeneric` can read the level once instead of every widget threading
 * it through. Plugin widgets loaded via module federation share the host's React and therefore see
 * the same context.
 *
 * Default is {@link ALLOW_ALL}, so anything rendered outside the provider behaves as before.
 */
export const AclContext: React.Context<AclResolver> = React.createContext<AclResolver>(ALLOW_ALL);
