import { Router } from 'express';
import { requireRole } from '../../middleware/permissions';
import { createUser, deleteUser, listUsers, updateUser } from './users.controller';

export const usersRoutes = Router();

usersRoutes.use(requireRole('admin', 'owner'));
usersRoutes.get('/', listUsers);
usersRoutes.post('/', createUser);
usersRoutes.patch('/:id', updateUser);
usersRoutes.delete('/:id', deleteUser);
