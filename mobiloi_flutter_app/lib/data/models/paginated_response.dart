class PaginationMeta {
  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasMore;

  const PaginationMeta({
    this.page = 1,
    this.limit = 10,
    this.total = 0,
    this.totalPages = 1,
    this.hasMore = false,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const PaginationMeta();
    }
    return PaginationMeta(
      page: json['page'] is int ? json['page'] as int : int.tryParse(json['page']?.toString() ?? '1') ?? 1,
      limit: json['limit'] is int ? json['limit'] as int : int.tryParse(json['limit']?.toString() ?? '10') ?? 10,
      total: json['total'] is int ? json['total'] as int : int.tryParse(json['total']?.toString() ?? '0') ?? 0,
      totalPages: json['totalPages'] is int ? json['totalPages'] as int : int.tryParse(json['totalPages']?.toString() ?? '1') ?? 1,
      hasMore: json['hasMore'] is bool
          ? json['hasMore'] as bool
          : (json['hasMore']?.toString().toLowerCase() == 'true'),
    );
  }
}

class PaginatedResponse<T> {
  final List<T> items;
  final PaginationMeta pagination;

  const PaginatedResponse({
    required this.items,
    required this.pagination,
  });
}
