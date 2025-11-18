import { PaginationDto } from '../dto/pagination.dto.js';

export function buildPagination(pagination?: PaginationDto) {
  const page = pagination?.page ?? 1;
  const perPage = pagination?.perPage ?? 10;
  const skip = (page - 1) * perPage;

  return { skip, take: perPage, page, perPage };
}
