import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class CountryInfo {
  final String iso;
  final String name;
  final String callingCode;
  final String flag;
  final int phoneLength;

  const CountryInfo({
    required this.iso,
    required this.name,
    required this.callingCode,
    required this.flag,
    required this.phoneLength,
  });

  String get displayName => '$flag  $name ($callingCode)';
}

class CountryData {
  static const List<CountryInfo> countries = [
    CountryInfo(iso: 'AF', name: 'Afghanistan', callingCode: '+93', flag: '🇦🇫', phoneLength: 9),
    CountryInfo(iso: 'AX', name: 'Åland Islands', callingCode: '+358', flag: '🇦🇽', phoneLength: 10),
    CountryInfo(iso: 'AL', name: 'Albania', callingCode: '+355', flag: '🇦🇱', phoneLength: 9),
    CountryInfo(iso: 'DZ', name: 'Algeria', callingCode: '+213', flag: '🇩🇿', phoneLength: 9),
    CountryInfo(iso: 'AD', name: 'Andorra', callingCode: '+376', flag: '🇦🇩', phoneLength: 6),
    CountryInfo(iso: 'AO', name: 'Angola', callingCode: '+244', flag: '🇦🇴', phoneLength: 9),
    CountryInfo(iso: 'AR', name: 'Argentina', callingCode: '+54', flag: '🇦🇷', phoneLength: 10),
    CountryInfo(iso: 'AU', name: 'Australia', callingCode: '+61', flag: '🇦🇺', phoneLength: 9),
    CountryInfo(iso: 'AT', name: 'Austria', callingCode: '+43', flag: '🇦🇹', phoneLength: 10),
    CountryInfo(iso: 'BH', name: 'Bahrain', callingCode: '+973', flag: '🇧🇭', phoneLength: 8),
    CountryInfo(iso: 'BD', name: 'Bangladesh', callingCode: '+880', flag: '🇧🇩', phoneLength: 10),
    CountryInfo(iso: 'BE', name: 'Belgium', callingCode: '+32', flag: '🇧🇪', phoneLength: 9),
    CountryInfo(iso: 'BR', name: 'Brazil', callingCode: '+55', flag: '🇧🇷', phoneLength: 11),
    CountryInfo(iso: 'CA', name: 'Canada', callingCode: '+1', flag: '🇨🇦', phoneLength: 10),
    CountryInfo(iso: 'CL', name: 'Chile', callingCode: '+56', flag: '🇨🇱', phoneLength: 9),
    CountryInfo(iso: 'CN', name: 'China', callingCode: '+86', flag: '🇨🇳', phoneLength: 11),
    CountryInfo(iso: 'CO', name: 'Colombia', callingCode: '+57', flag: '🇨🇴', phoneLength: 10),
    CountryInfo(iso: 'DK', name: 'Denmark', callingCode: '+45', flag: '🇩🇰', phoneLength: 8),
    CountryInfo(iso: 'EG', name: 'Egypt', callingCode: '+20', flag: '🇪🇬', phoneLength: 10),
    CountryInfo(iso: 'FI', name: 'Finland', callingCode: '+358', flag: '🇫🇮', phoneLength: 10),
    CountryInfo(iso: 'FR', name: 'France', callingCode: '+33', flag: '🇫🇷', phoneLength: 9),
    CountryInfo(iso: 'DE', name: 'Germany', callingCode: '+49', flag: '🇩🇪', phoneLength: 11),
    CountryInfo(iso: 'GR', name: 'Greece', callingCode: '+30', flag: '🇬🇷', phoneLength: 10),
    CountryInfo(iso: 'IN', name: 'India', callingCode: '+91', flag: '🇮🇳', phoneLength: 10),
    CountryInfo(iso: 'ID', name: 'Indonesia', callingCode: '+62', flag: '🇮🇩', phoneLength: 10),
    CountryInfo(iso: 'IE', name: 'Ireland', callingCode: '+353', flag: '🇮🇪', phoneLength: 9),
    CountryInfo(iso: 'IT', name: 'Italy', callingCode: '+39', flag: '🇮🇹', phoneLength: 10),
    CountryInfo(iso: 'JP', name: 'Japan', callingCode: '+81', flag: '🇯🇵', phoneLength: 10),
    CountryInfo(iso: 'KE', name: 'Kenya', callingCode: '+254', flag: '🇰🇪', phoneLength: 9),
    CountryInfo(iso: 'KW', name: 'Kuwait', callingCode: '+965', flag: '🇰🇼', phoneLength: 8),
    CountryInfo(iso: 'MY', name: 'Malaysia', callingCode: '+60', flag: '🇲🇾', phoneLength: 10),
    CountryInfo(iso: 'MX', name: 'Mexico', callingCode: '+52', flag: '🇲🇽', phoneLength: 10),
    CountryInfo(iso: 'NP', name: 'Nepal', callingCode: '+977', flag: '🇳🇵', phoneLength: 10),
    CountryInfo(iso: 'NL', name: 'Netherlands', callingCode: '+31', flag: '🇳🇱', phoneLength: 9),
    CountryInfo(iso: 'NZ', name: 'New Zealand', callingCode: '+64', flag: '🇳🇿', phoneLength: 9),
    CountryInfo(iso: 'NG', name: 'Nigeria', callingCode: '+234', flag: '🇳🇬', phoneLength: 10),
    CountryInfo(iso: 'NO', name: 'Norway', callingCode: '+47', flag: '🇳🇴', phoneLength: 8),
    CountryInfo(iso: 'OM', name: 'Oman', callingCode: '+968', flag: '🇴🇲', phoneLength: 8),
    CountryInfo(iso: 'PK', name: 'Pakistan', callingCode: '+92', flag: '🇵🇰', phoneLength: 10),
    CountryInfo(iso: 'PH', name: 'Philippines', callingCode: '+63', flag: '🇵🇭', phoneLength: 10),
    CountryInfo(iso: 'PL', name: 'Poland', callingCode: '+48', flag: '🇵🇱', phoneLength: 9),
    CountryInfo(iso: 'QA', name: 'Qatar', callingCode: '+974', flag: '🇶🇦', phoneLength: 8),
    CountryInfo(iso: 'RU', name: 'Russia', callingCode: '+7', flag: '🇷🇺', phoneLength: 10),
    CountryInfo(iso: 'MF', name: 'Saint Martin (French part)', callingCode: '+590', flag: '🇸🇽', phoneLength: 9),
    CountryInfo(iso: 'SA', name: 'Saudi Arabia', callingCode: '+966', flag: '🇸🇦', phoneLength: 9),
    CountryInfo(iso: 'SG', name: 'Singapore', callingCode: '+65', flag: '🇸🇬', phoneLength: 8),
    CountryInfo(iso: 'ZA', name: 'South Africa', callingCode: '+27', flag: '🇿🇦', phoneLength: 9),
    CountryInfo(iso: 'KR', name: 'South Korea', callingCode: '+82', flag: '🇰🇷', phoneLength: 10),
    CountryInfo(iso: 'ES', name: 'Spain', callingCode: '+34', flag: '🇪🇸', phoneLength: 9),
    CountryInfo(iso: 'LK', name: 'Sri Lanka', callingCode: '+94', flag: '🇱🇰', phoneLength: 9),
    CountryInfo(iso: 'SE', name: 'Sweden', callingCode: '+46', flag: '🇸🇪', phoneLength: 9),
    CountryInfo(iso: 'CH', name: 'Switzerland', callingCode: '+41', flag: '🇨🇭', phoneLength: 9),
    CountryInfo(iso: 'TH', name: 'Thailand', callingCode: '+66', flag: '🇹🇭', phoneLength: 9),
    CountryInfo(iso: 'TR', name: 'Turkey', callingCode: '+90', flag: '🇹🇷', phoneLength: 10),
    CountryInfo(iso: 'AE', name: 'United Arab Emirates', callingCode: '+971', flag: '🇦🇪', phoneLength: 9),
    CountryInfo(iso: 'GB', name: 'United Kingdom', callingCode: '+44', flag: '🇬🇧', phoneLength: 10),
    CountryInfo(iso: 'US', name: 'United States', callingCode: '+1', flag: '🇺🇸', phoneLength: 10),
    CountryInfo(iso: 'VN', name: 'Vietnam', callingCode: '+84', flag: '🇻🇳', phoneLength: 9),
  ];

  static const CountryInfo defaultCountry = CountryInfo(
    iso: 'IN',
    name: 'India',
    callingCode: '+91',
    flag: '🇮🇳',
    phoneLength: 10,
  );

  static CountryInfo findByIso(String iso) {
    return countries.firstWhere(
      (c) => c.iso.toUpperCase() == iso.toUpperCase(),
      orElse: () => defaultCountry,
    );
  }

  static CountryInfo findByCallingCode(String code) {
    final cleanCode = code.startsWith('+') ? code : '+$code';
    return countries.firstWhere(
      (c) => c.callingCode == cleanCode,
      orElse: () => defaultCountry,
    );
  }
}

class CountryCodeSelector extends StatefulWidget {
  final CountryInfo selectedCountry;
  final ValueChanged<CountryInfo> onChanged;

  const CountryCodeSelector({
    super.key,
    required this.selectedCountry,
    required this.onChanged,
  });

  @override
  State<CountryCodeSelector> createState() => _CountryCodeSelectorState();
}

class _CountryCodeSelectorState extends State<CountryCodeSelector> {
  final LayerLink _layerLink = LayerLink();
  OverlayEntry? _overlayEntry;
  bool _isOpen = false;

  @override
  void dispose() {
    _closeDropdown();
    super.dispose();
  }

  void _toggleDropdown() {
    if (_isOpen) {
      _closeDropdown();
    } else {
      _openDropdown();
    }
  }

  void _closeDropdown() {
    if (_overlayEntry != null) {
      _overlayEntry?.remove();
      _overlayEntry = null;
      if (mounted) {
        setState(() {
          _isOpen = false;
        });
      }
    }
  }

  void _openDropdown() {
    _closeDropdown();

    // Dismiss active keyboard
    FocusManager.instance.primaryFocus?.unfocus();

    final renderBox = context.findRenderObject() as RenderBox?;
    if (renderBox == null || !renderBox.hasSize) return;

    final overlay = Overlay.of(context);
    final size = renderBox.size;
    final offset = renderBox.localToGlobal(Offset.zero);
    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Constrain width: compact on desktop/tablet, responsive on small mobile
    double dropdownWidth = 280.0;
    if (dropdownWidth > screenSize.width - 24.0) {
      dropdownWidth = screenSize.width - 24.0;
    }

    // Horizontal offset relative to target: clamp within screen margins
    double dxOffset = 0.0;
    if (offset.dx + dropdownWidth > screenSize.width - 12.0) {
      dxOffset = (screenSize.width - 12.0) - (offset.dx + dropdownWidth);
    }
    if (offset.dx + dxOffset < 12.0) {
      dxOffset = 12.0 - offset.dx;
    }

    // Dropdown is ALWAYS positioned strictly BELOW the phone field (size.height + 4.0)
    // Never open above the field to avoid covering Email or other fields
    final double spaceBelow = screenSize.height - (offset.dy + size.height) - mediaQuery.padding.bottom - 16.0;
    final double availableHeight = spaceBelow < 260.0 ? spaceBelow.clamp(140.0, 260.0) : 260.0;

    if (spaceBelow < 220.0) {
      Scrollable.ensureVisible(
        context,
        alignment: 0.15,
        duration: const Duration(milliseconds: 200),
      );
    }

    _overlayEntry = OverlayEntry(
      builder: (ctx) {
        return Stack(
          children: [
            // 1. Transparent full-screen dismiss barrier
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _closeDropdown,
                child: const ColoredBox(color: Colors.transparent),
              ),
            ),

            // 2. Anchored compact dropdown popover strictly below field
            CompositedTransformFollower(
              link: _layerLink,
              showWhenUnlinked: false,
              offset: Offset(dxOffset, size.height + 4.0),
              child: _CountryDropdownMenu(
                selectedCountry: widget.selectedCountry,
                width: dropdownWidth,
                maxHeight: availableHeight,
                isDark: isDark,
                onSelected: (country) {
                  widget.onChanged(country);
                  _closeDropdown();
                },
              ),
            ),
          ],
        );
      },
    );

    overlay.insert(_overlayEntry!);
    setState(() {
      _isOpen = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return CompositedTransformTarget(
      link: _layerLink,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: _toggleDropdown,
          borderRadius: BorderRadius.circular(30),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkBackground : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(
              color: _isOpen
                  ? AppColors.primaryPink
                  : (isDark ? AppColors.darkCardBorder : Colors.transparent),
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                widget.selectedCountry.flag,
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(width: 6),
              Text(
                widget.selectedCountry.callingCode,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                _isOpen ? Icons.arrow_drop_up : Icons.arrow_drop_down,
                size: 20,
                color: _isOpen
                    ? AppColors.primaryPink
                    : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
}

class _CountryDropdownMenu extends StatefulWidget {
  final CountryInfo selectedCountry;
  final ValueChanged<CountryInfo> onSelected;
  final double width;
  final double maxHeight;
  final bool isDark;

  const _CountryDropdownMenu({
    required this.selectedCountry,
    required this.onSelected,
    required this.width,
    required this.maxHeight,
    required this.isDark,
  });

  @override
  State<_CountryDropdownMenu> createState() => _CountryDropdownMenuState();
}

class _CountryDropdownMenuState extends State<_CountryDropdownMenu> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  List<CountryInfo> _filteredCountries = CountryData.countries;

  @override
  void initState() {
    super.initState();
    _filteredCountries = CountryData.countries;
  }

  void _onSearchChanged(String query) {
    final q = query.trim().toLowerCase();
    setState(() {
      if (q.isEmpty) {
        _filteredCountries = CountryData.countries;
      } else {
        final qDigits = q.replaceAll(RegExp(r'\D'), '');
        _filteredCountries = CountryData.countries.where((c) {
          final nameMatch = c.name.toLowerCase().contains(q);
          final isoMatch = c.iso.toLowerCase() == q || c.iso.toLowerCase().startsWith(q);
          final codeMatch = c.callingCode.toLowerCase().contains(q) ||
              (qDigits.isNotEmpty && c.callingCode.replaceAll('+', '').contains(qDigits));
          return nameMatch || isoMatch || codeMatch;
        }).toList();
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;

    return Material(
      elevation: 12,
      shadowColor: Colors.black.withOpacity(0.3),
      borderRadius: BorderRadius.circular(16),
      clipBehavior: Clip.antiAlias,
      color: isDark ? AppColors.darkSurface : Colors.white,
      child: Container(
        width: widget.width,
        height: widget.maxHeight,
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkSurface : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
            width: 1,
          ),
        ),
        child: Column(
          children: [
            // Pinned Search Bar at the Top
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
              child: Container(
                height: 38,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBackground : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : const Color(0xFFE2E8F0),
                  ),
                ),
                child: TextField(
                  controller: _searchController,
                  focusNode: _focusNode,
                  autofocus: false,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search country or code (e.g. +91)...',
                    hintStyle: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                    prefixIcon: Icon(
                      Icons.search,
                      size: 18,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                    prefixIconConstraints: const BoxConstraints(minWidth: 34, minHeight: 34),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              _onSearchChanged('');
                            },
                            child: Icon(
                              Icons.clear,
                              size: 16,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          )
                        : null,
                    suffixIconConstraints: const BoxConstraints(minWidth: 30, minHeight: 34),
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
                    border: InputBorder.none,
                  ),
                  onChanged: _onSearchChanged,
                ),
              ),
            ),
            Divider(
              height: 1,
              thickness: 1,
              color: isDark ? AppColors.darkCardBorder : const Color(0xFFF1F5F9),
            ),

            // Scrollable Country List
            Expanded(
              child: _filteredCountries.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.public_off_outlined, size: 28, color: Colors.grey.shade400),
                            const SizedBox(height: 6),
                            Text(
                              'No country found',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      itemCount: _filteredCountries.length,
                      itemBuilder: (context, index) {
                        final country = _filteredCountries[index];
                        final isSelected = country.iso == widget.selectedCountry.iso;

                        return InkWell(
                          onTap: () => widget.onSelected(country),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            color: isSelected
                                ? (isDark ? AppColors.primaryPink.withOpacity(0.15) : const Color(0xFFFDF2F8))
                                : Colors.transparent,
                            child: Row(
                              children: [
                                Text(
                                  country.flag,
                                  style: const TextStyle(fontSize: 18),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  country.callingCode,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                    color: isSelected
                                        ? AppColors.primaryPink
                                        : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    '(${country.name})',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

