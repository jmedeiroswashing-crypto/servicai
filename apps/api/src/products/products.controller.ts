import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators/current-user.decorator.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('city') city?: string,
    @Query('q') q?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productsService.findAll({
      category,
      city,
      q,
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.userId, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthUser) {
    return this.productsService.findMine(user.userId);
  }

  @Get('favorites/mine')
  @UseGuards(JwtAuthGuard)
  findFavorites(@CurrentUser() user: AuthUser) {
    return this.productsService.findFavorites(user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.remove(user.userId, id);
  }

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  favorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.favorite(user.userId, id);
  }

  @Delete(':id/favorite')
  @UseGuards(JwtAuthGuard)
  unfavorite(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productsService.unfavorite(user.userId, id);
  }
}
