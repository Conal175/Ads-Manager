import {authClient,sameOrigin} from '@/lib/auth/server';
import {resolveIdentity} from '@/lib/auth/identity';
import {pool} from '@/db';
import {graphAds} from '@/lib/meta-ad-management';
import {createAdManagementHandler} from '@/lib/meta-ad-management-handler';
export const dynamic='force-dynamic';
export const POST=createAdManagementHandler({authClient,sameOrigin,resolveIdentity,pool,graphAds});
