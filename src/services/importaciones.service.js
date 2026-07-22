import { listErrores, listImportaciones } from '../repositories/importaciones.repository.js';

export async function getImportaciones(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 25, 1), 100);
  const result = await listImportaciones({ page, pageSize });
  return {
    data: result.rows,
    pagination: {
      page,
      pageSize,
      totalRecords: result.total,
      totalPages: Math.ceil(result.total / pageSize)
    }
  };
}

export async function getImportacionErrores(id) {
  return listErrores(id);
}
