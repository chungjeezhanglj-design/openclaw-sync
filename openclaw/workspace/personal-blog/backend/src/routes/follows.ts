import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFriends,
  getFollowStatus,
  getUserFollowCounts,
  searchUsers,
} from '../controllers/follows';
import { recordOperationLog } from '../middlewares/recordOperationLog';

const router = Router();

router.post(
  '/users/:id/follow',
  authenticate,
  recordOperationLog({
    action: 'USER_FOLLOW',
    module: 'SOCIAL',
  }),
  followUser
);
router.delete(
  '/users/:id/follow',
  authenticate,
  recordOperationLog({
    action: 'USER_UNFOLLOW',
    module: 'SOCIAL',
  }),
  unfollowUser
);
router.get('/users/:id/followers', authenticate, getFollowers);
router.get('/users/:id/following', authenticate, getFollowing);
router.get('/users/:id/friends', authenticate, getFriends);
router.get('/users/:id/follow-status', authenticate, getFollowStatus);
router.get('/users/:id/follow-counts', getUserFollowCounts);
router.get('/users/search', authenticate, searchUsers);

export default router;
