import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  list(@Query('city') city?: string) {
    return this.categoriesService.list(city);
  }

  @Get('popular')
  popular(@Query('city') city?: string) {
    return this.categoriesService.popular(city);
  }

  @Get('recent-requests')
  recentRequests(@Query('city') city?: string) {
    return this.categoriesService.recentRequests(city);
  }
}
