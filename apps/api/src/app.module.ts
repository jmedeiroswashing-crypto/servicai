import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { MediaModule } from './media/media.module.js';
import { ChatModule } from './chat/chat.module.js';
import { SearchModule } from './search/search.module.js';
import { AiModule } from './ai/ai.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProvidersModule,
    ListingsModule,
    ReviewsModule,
    BookingsModule,
    MediaModule,
    ChatModule,
    SearchModule,
    AiModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
