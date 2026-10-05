class PaginatedState<T> {
  final List<T> items;
  final int page;
  final int limit;
  final int total;
  final bool hasMore;
  final bool isLoadingFirstPage;
  final bool isLoadingMore;
  final String? error;

  const PaginatedState({
    this.items = const [],
    this.page = 1,
    this.limit = 10,
    this.total = 0,
    this.hasMore = true,
    this.isLoadingFirstPage = false,
    this.isLoadingMore = false,
    this.error,
  });

  PaginatedState<T> copyWith({
    List<T>? items,
    int? page,
    int? limit,
    int? total,
    bool? hasMore,
    bool? isLoadingFirstPage,
    bool? isLoadingMore,
    String? Function()? error,
  }) {
    return PaginatedState<T>(
      items: items ?? this.items,
      page: page ?? this.page,
      limit: limit ?? this.limit,
      total: total ?? this.total,
      hasMore: hasMore ?? this.hasMore,
      isLoadingFirstPage: isLoadingFirstPage ?? this.isLoadingFirstPage,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      error: error != null ? error() : this.error,
    );
  }
}
