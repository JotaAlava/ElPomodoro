import { UserProfile } from '@auth0/nextjs-auth0/client';
import React from 'react';

export interface AppContextState {
	user: UserProfile | undefined;
}

export const initalContextValue: AppContextState = {
	user: undefined
};

export const AppContext = React.createContext<AppContextState>(initalContextValue);
