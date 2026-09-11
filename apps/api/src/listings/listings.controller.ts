import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { ListingsService } from './listings.service.js';
import { CreateListingDto } from './dto/create-listing.dto.js';
import { UpdateListingDto } from './dto/update-listing.dto.js';
import { GenerateDescriptionDto, SuggestPriceDto } from './dto/ai-assist.dto.js';
import { AiService } from '../ai/ai.service.js';

@Controller('listings')
export class ListingsController {
  constructor(
    private listingsService: ListingsService,
    private aiService: AiService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.listingsService.create(user.userId, dto);
  }

  @Post('ai/generate-description')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  generateDescription(@Body() dto: GenerateDescriptionDto) {
    return this.aiService.generateServiceDescription(dto).then((description) => ({ description }));
  }

  @Post('ai/suggest-price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  suggestPrice(@Body() dto: SuggestPriceDto) {
    return this.aiService.suggestPriceRange(dto);
  }

  @Get()
  findAll(@Query('category') category?: string, @Query('skip') skip?: string, @Query('take') take?: string) {
    return this.listingsService.findAll({
      category,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateListingDto) {
    return this.listingsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PRESTADOR)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.listingsService.remove(user.userId, id);
  }
}
