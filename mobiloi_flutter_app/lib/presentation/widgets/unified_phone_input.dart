import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import 'country_code_selector.dart';

class UnifiedPhoneInput extends StatefulWidget {
  final TextEditingController controller;
  final CountryInfo selectedCountry;
  final ValueChanged<CountryInfo> onCountryChanged;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onEditingComplete;
  final String? errorText;
  final String? hintText;
  final bool readOnly;
  final Widget? trailing;

  const UnifiedPhoneInput({
    super.key,
    required this.controller,
    required this.selectedCountry,
    required this.onCountryChanged,
    this.onChanged,
    this.onEditingComplete,
    this.errorText,
    this.hintText,
    this.readOnly = false,
    this.trailing,
  });

  @override
  State<UnifiedPhoneInput> createState() => _UnifiedPhoneInputState();
}

class _UnifiedPhoneInputState extends State<UnifiedPhoneInput> {
  final FocusNode _focusNode = FocusNode();
  final LayerLink _layerLink = LayerLink();
  final GlobalKey _fieldKey = GlobalKey();
  OverlayEntry? _overlayEntry;
  bool _isDropdownOpen = false;
  bool _isFocused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_handleFocusChange);
  }

  void _handleFocusChange() {
    if (mounted) {
      setState(() {
        _isFocused = _focusNode.hasFocus;
      });
    }
  }

  @override
  void dispose() {
    _closeDropdown();
    _focusNode.removeListener(_handleFocusChange);
    _focusNode.dispose();
    super.dispose();
  }

  void _toggleDropdown() {
    if (_isDropdownOpen) {
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
          _isDropdownOpen = false;
        });
      }
    }
  }

  void _openDropdown() {
    _closeDropdown();

    // Dismiss any active keyboard so it does not block the dropdown list
    FocusManager.instance.primaryFocus?.unfocus();

    final renderBox = (_fieldKey.currentContext?.findRenderObject() as RenderBox?) ??
        (context.findRenderObject() as RenderBox?);
    if (renderBox == null || !renderBox.hasSize) return;

    final overlay = Overlay.of(context);
    final size = renderBox.size;
    final offset = renderBox.localToGlobal(Offset.zero);
    final mediaQuery = MediaQuery.of(context);
    final screenSize = mediaQuery.size;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Dropdown width matches field width or responsive minimum
    double dropdownWidth = max(size.width, 280.0);
    if (dropdownWidth > screenSize.width - 24.0) {
      dropdownWidth = screenSize.width - 24.0;
    }

    // Horizontal offset relative to target: clamp within screen bounds
    double dxOffset = 0.0;
    if (offset.dx + dropdownWidth > screenSize.width - 12.0) {
      dxOffset = (screenSize.width - 12.0) - (offset.dx + dropdownWidth);
    }
    if (offset.dx + dxOffset < 12.0) {
      dxOffset = 12.0 - offset.dx;
    }

    // Dropdown is ALWAYS positioned strictly BELOW the phone field (size.height + 4.0)
    // Never open above the field to avoid covering Email or Phone Number fields
    final double spaceBelow = screenSize.height - (offset.dy + size.height) - mediaQuery.padding.bottom - 16.0;
    final double availableHeight = spaceBelow < 260.0 ? spaceBelow.clamp(140.0, 260.0) : 260.0;

    // If space below is cramped, bring into visible upper region of scrollable
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
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTap: _closeDropdown,
                child: const ColoredBox(color: Colors.transparent),
              ),
            ),
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
                  widget.onCountryChanged(country);
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
      _isDropdownOpen = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasError = widget.errorText != null && widget.errorText!.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        CompositedTransformTarget(
          link: _layerLink,
          child: Container(
            key: _fieldKey,
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBackground : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(
                color: hasError
                    ? Colors.redAccent
                    : (_isFocused || _isDropdownOpen
                        ? AppColors.primaryPink
                        : (isDark ? AppColors.darkCardBorder : Colors.transparent)),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                // Left: Country Code Trigger
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _toggleDropdown,
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(30)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(widget.selectedCountry.flag, style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 6),
                          Text(
                            widget.selectedCountry.callingCode,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            _isDropdownOpen
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_down_rounded,
                            size: 18,
                            color: _isDropdownOpen
                                ? AppColors.primaryPink
                                : (isDark ? Colors.grey.shade400 : Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Subtle Divider
              Container(
                width: 1,
                height: 22,
                color: isDark ? Colors.white24 : Colors.grey.shade300,
                margin: const EdgeInsets.only(right: 8),
              ),

              // Right: Phone Number Input (NO phone icon in the middle)
              Expanded(
                child: TextField(
                  controller: widget.controller,
                  focusNode: _focusNode,
                  readOnly: widget.readOnly,
                  keyboardType: TextInputType.phone,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(widget.selectedCountry.phoneLength),
                  ],
                  style: TextStyle(
                    fontSize: 14,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    border: InputBorder.none,
                    hintText: widget.hintText ?? 'Phone ( digits) *',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.darkTextSecondary : Colors.grey.shade500,
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
                  ),
                  onChanged: widget.onChanged,
                  onEditingComplete: widget.onEditingComplete,
                ),
              ),

              // Optional Trailing Widget (e.g. inside badge or button)
              if (widget.trailing != null) ...[
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: widget.trailing!,
                ),
              ],
            ],
          ),
        ),
      ),

        // Error Text
        if (hasError)
          Padding(
            padding: const EdgeInsets.only(left: 14, top: 4),
            child: Text(
              widget.errorText!,
              style: const TextStyle(color: Colors.redAccent, fontSize: 11),
            ),
          ),
      ],
    );
  }
}

class _CountryDropdownMenu extends StatefulWidget {
  final CountryInfo selectedCountry;
  final double width;
  final double maxHeight;
  final bool isDark;
  final ValueChanged<CountryInfo> onSelected;

  const _CountryDropdownMenu({
    required this.selectedCountry,
    required this.width,
    required this.maxHeight,
    required this.isDark,
    required this.onSelected,
  });

  @override
  State<_CountryDropdownMenu> createState() => _CountryDropdownMenuState();
}

class _CountryDropdownMenuState extends State<_CountryDropdownMenu> {
  final TextEditingController _searchCtrl = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  List<CountryInfo> _filteredCountries = CountryData.countries;

  @override
  void initState() {
    super.initState();
    _filteredCountries = List.from(CountryData.countries);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) {
      setState(() {
        _filteredCountries = List.from(CountryData.countries);
      });
      return;
    }

    final qDigits = q.replaceAll(RegExp(r'\D'), '');

    setState(() {
      _filteredCountries = CountryData.countries.where((c) {
        final matchName = c.name.toLowerCase().contains(q);
        final matchIso = c.iso.toLowerCase() == q;
        final matchCalling = c.callingCode.toLowerCase().contains(q);
        final matchDigits = qDigits.isNotEmpty && c.callingCode.replaceAll('+', '').contains(qDigits);

        return matchName || matchIso || matchCalling || matchDigits;
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;

    return Material(
      color: Colors.transparent,
      elevation: 8,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: widget.width,
        constraints: BoxConstraints(maxHeight: widget.maxHeight),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E2230) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark ? const Color(0xFF2E3446) : Colors.grey.shade200,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.4 : 0.12),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Pinned search field
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 6),
              child: SizedBox(
                height: 38,
                child: TextField(
                  controller: _searchCtrl,
                  focusNode: _searchFocus,
                  autofocus: false,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    hintText: 'Search country or code...',
                    hintStyle: TextStyle(
                      fontSize: 12,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade500,
                    ),
                    prefixIcon: Icon(
                      Icons.search,
                      size: 18,
                      color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                    ),
                    suffixIcon: _searchCtrl.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 16),
                            padding: EdgeInsets.zero,
                            onPressed: () {
                              _searchCtrl.clear();
                              _onSearchChanged('');
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: isDark ? const Color(0xFF161922) : Colors.grey.shade100,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 0),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
            ),
            const Divider(height: 1, thickness: 1),

            // Scrollable list
            Flexible(
              child: _filteredCountries.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                      child: Text(
                        'No country found',
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
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
                            color: isSelected
                                ? (isDark ? AppColors.primaryPink.withOpacity(0.18) : AppColors.primaryPink.withOpacity(0.08))
                                : Colors.transparent,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                            child: Row(
                              children: [
                                Text(country.flag, style: const TextStyle(fontSize: 18)),
                                const SizedBox(width: 8),
                                Text(
                                  country.callingCode,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isSelected
                                        ? AppColors.primaryPink
                                        : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    '(${country.name})',
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                      color: isSelected
                                          ? AppColors.primaryPink
                                          : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
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
