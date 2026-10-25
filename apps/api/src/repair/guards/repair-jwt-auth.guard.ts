import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RepairJwtAuthGuard extends AuthGuard('repair-jwt') {}
