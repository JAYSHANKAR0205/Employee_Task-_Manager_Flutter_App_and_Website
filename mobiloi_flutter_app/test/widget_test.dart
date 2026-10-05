import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mobiloi_flutter_app/app_router.dart';
import 'package:mobiloi_flutter_app/main.dart';
import 'package:mobiloi_flutter_app/core/utils/app_navigation.dart';
import 'package:mobiloi_flutter_app/core/utils/validators.dart';
import 'dart:typed_data';
import 'package:mobiloi_flutter_app/data/models/paginated_response.dart';
import 'package:mobiloi_flutter_app/data/models/task_model.dart';
import 'package:mobiloi_flutter_app/data/models/user_model.dart';
import 'package:mobiloi_flutter_app/presentation/widgets/country_code_selector.dart';
import 'package:mobiloi_flutter_app/presentation/widgets/unified_phone_input.dart';

void main() {
  group('Validators Unit Tests', () {
    test('validateLeaveReason allows words, numbers, and spaces', () {
      expect(Validators.validateLeaveReason('Family function 2026'), isNull);
      expect(Validators.validateLeaveReason('Medical emergency'), isNull);
      expect(Validators.validateLeaveReason('Personal work 123'), isNull);
    });

    test('validateLeaveReason rejects special characters strictly', () {
      expect(
        Validators.validateLeaveReason('Family function @home'),
        equals('Reason can only contain letters, numbers, and spaces. Special characters are not allowed.'),
      );
      expect(
        Validators.validateLeaveReason('Emergency!'),
        equals('Reason can only contain letters, numbers, and spaces. Special characters are not allowed.'),
      );
      expect(
        Validators.validateLeaveReason('Sick <fever>'),
        equals('Reason can only contain letters, numbers, and spaces. Special characters are not allowed.'),
      );
    });

    test('validateEmail validates email format correctly', () {
      expect(Validators.validateEmail('employee@company.com'), isNull);
      expect(Validators.validateEmail('invalid-email'), equals('Please enter a valid email.'));
    });

    test('validateFirstName and validateLastName enforce backend constraints', () {
      expect(Validators.validateFirstName('John'), isNull);
      expect(Validators.validateFirstName(''), equals('Please enter your first name.'));
      expect(Validators.validateFirstName('J'), equals('Please enter valid first name.'));
      expect(Validators.validateFirstName('John123'), equals('Please enter valid first name.'));
      expect(Validators.validateFirstName('John Doe'), equals('Please enter valid first name.'));

      expect(Validators.validateLastName('Doe'), isNull);
      expect(Validators.validateLastName(''), equals('Please enter your last name.'));
      expect(Validators.validateLastName('D'), equals('Please enter valid last name.'));
    });

    test('validateTaskTitle enforces character and space restrictions', () {
      expect(Validators.validateTaskTitle('Update Mobile API'), isNull);
      expect(Validators.validateTaskTitle(''), equals('Task title is required.'));
      expect(Validators.validateTaskTitle('Task  Title'), equals('Task title cannot contain continuous spaces.'));
      expect(Validators.validateTaskTitle('Task 123'), equals('Task title cannot contain numbers or special characters.'));
      expect(Validators.validateTaskTitle('Task #@!'), equals('Task title cannot contain numbers or special characters.'));
    });

    test('validateTaskDescription enforces backend length and characters', () {
      expect(Validators.validateTaskDescription('Valid description with details, hyphens-and dots.'), isNull);
      expect(Validators.validateTaskDescription(''), equals('Task description is required.'));
      expect(Validators.validateTaskDescription('Double  space description'), equals('Task description cannot contain continuous spaces.'));
      expect(Validators.validateTaskDescription('Invalid #@! character description'), equals('Task description cannot contain special characters other than commas, hyphens, and full stops.'));
    });

    test('validateTaskDueDate prevents past dates', () {
      final today = DateTime.now();
      expect(Validators.validateTaskDueDate(today), isNull);
      expect(Validators.validateTaskDueDate(today.add(const Duration(days: 5))), isNull);
      expect(Validators.validateTaskDueDate(today.subtract(const Duration(days: 2))), equals('Task due date cannot be in the past.'));
      expect(Validators.validateTaskDueDate(null), equals('Due date is required.'));
    });

    test('validatePassword and validateConfirmPassword enforce rules', () {
      expect(Validators.validatePassword('Strong@123'), isNull);
      expect(Validators.validatePassword('weak'), equals('Please enter min 8 character password.'));
      expect(Validators.validatePassword('nouppercase@1'), equals('Please enter 1 upper case.'));
      expect(Validators.validatePassword('NOLOWERCASE@1'), equals('Please enter 1 lower case.'));
      expect(Validators.validatePassword('NoNumberSpecial!'), equals('Please enter 1 number.'));
      expect(Validators.validatePassword('NoSpecial1234'), equals('Please enter 1 special character.'));

      expect(Validators.validateConfirmPassword('Strong@123', 'Strong@123'), isNull);
      expect(Validators.validateConfirmPassword('Strong@123', 'Mismatch@123'), equals('Passwords do not match.'));
      expect(Validators.validateConfirmPassword('Strong@123', ''), equals('Please confirm your password.'));
    });

    test('UserModel status evaluates unverified admin-created user as Pending', () {
      final userJson = {
        '_id': '123',
        'firstName': 'John',
        'lastName': 'Doe',
        'email': 'john.doe@company.com',
        'role': 'Employee',
        'isBlocked': false,
        'isCreatedByAdmin': true,
        'isProfileComplete': false,
        'isVerified': false,
      };
      final user = UserModel.fromJson(userJson);
      expect(user.status, equals('Pending'));
    });
  });

  group('UserModel and Role Tests', () {
    test('Admin user model detects isAdmin correctly', () {
      final adminUser = UserModel(
        id: 'admin-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@company.com',
        role: 'Admin',
      );
      expect(adminUser.isAdmin, isTrue);
      expect(adminUser.isEmployee, isFalse);
    });

    test('Employee user model detects isEmployee correctly', () {
      final employeeUser = UserModel(
        id: 'emp-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@company.com',
        role: 'Employee',
      );
      expect(employeeUser.isEmployee, isTrue);
      expect(employeeUser.isAdmin, isFalse);
    });
  });

  group('Pagination Model Tests', () {
    test('PaginationMeta calculates totalPages and hasMore properly', () {
      final meta = PaginationMeta.fromJson({
        'page': 1,
        'limit': 10,
        'total': 25,
        'totalPages': 3,
        'hasMore': true,
      });

      expect(meta.page, equals(1));
      expect(meta.limit, equals(10));
      expect(meta.total, equals(25));
      expect(meta.totalPages, equals(3));
      expect(meta.hasMore, isTrue);
    });

    test('PaginationMeta handles empty/fallback data gracefully', () {
      final meta = PaginationMeta.fromJson({});
      expect(meta.page, equals(1));
      expect(meta.limit, equals(10));
      expect(meta.total, equals(0));
      expect(meta.totalPages, equals(1));
      expect(meta.hasMore, isFalse);
    });
  });

  group('Navigation & Call Stack Tests', () {
    setUp(() {
      AppNavigation.resetDebounce();
    });

    test('AppNavigation.shouldNavigate debounces rapid double-taps', () {
      AppNavigation.resetDebounce();
      expect(AppNavigation.shouldNavigate(), isTrue);
      // Immediately subsequent call within 300ms must be rejected
      expect(AppNavigation.shouldNavigate(), isFalse);

      AppNavigation.resetDebounce();
      expect(AppNavigation.shouldNavigate(), isTrue);
    });

    testWidgets('Switching Login and Register repeatedly replaces routes and does not accumulate call stack', (tester) async {
      final router = GoRouter(
        initialLocation: '/login',
        routes: [
          GoRoute(
            path: '/login',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('to_register'),
                  onPressed: () => AppNavigation.replace(context, '/register'),
                  child: const Text('To Register'),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/register',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('to_login'),
                  onPressed: () => AppNavigation.replace(context, '/login'),
                  child: const Text('To Login'),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Dashboard')),
            ),
          ),
        ],
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('to_register')), findsOneWidget);
      expect(router.routerDelegate.currentConfiguration.matches.length, equals(1));
      expect(router.routerDelegate.currentConfiguration.uri.toString(), equals('/login'));

      // Perform 10 transitions: Login -> Register -> Login -> Register...
      for (int i = 0; i < 5; i++) {
        AppNavigation.resetDebounce();
        await tester.tap(find.byKey(const Key('to_register')));
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('to_login')), findsOneWidget);
        expect(router.routerDelegate.currentConfiguration.uri.toString(), equals('/register'));
        expect(router.routerDelegate.currentConfiguration.matches.length, equals(1));

        AppNavigation.resetDebounce();
        await tester.tap(find.byKey(const Key('to_login')));
        await tester.pumpAndSettle();
        expect(find.byKey(const Key('to_register')), findsOneWidget);
        expect(router.routerDelegate.currentConfiguration.uri.toString(), equals('/login'));
        expect(router.routerDelegate.currentConfiguration.matches.length, equals(1));
      }

      // CanPop on the root navigator should be false - not 10 items deep!
      final BuildContext currentContext = tester.element(find.byKey(const Key('to_register')));
      expect(GoRouter.of(currentContext).canPop(), isFalse);
    });

    testWidgets('Normal application navigation preserves push and pop history', (tester) async {
      final router = GoRouter(
        initialLocation: '/dashboard',
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('to_tasks'),
                  onPressed: () => AppNavigation.push(context, '/tasks'),
                  child: const Text('To Tasks'),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/tasks',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('to_details'),
                  onPressed: () => AppNavigation.push(context, '/tasks/detail'),
                  child: const Text('To Detail'),
                ),
              ),
            ),
          ),
          GoRoute(
            path: '/tasks/detail',
            builder: (context, state) => Scaffold(
              body: Center(
                child: ElevatedButton(
                  key: const Key('back_btn'),
                  onPressed: () => context.pop(),
                  child: const Text('Back'),
                ),
              ),
            ),
          ),
        ],
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('to_tasks')), findsOneWidget);

      AppNavigation.resetDebounce();
      await tester.tap(find.byKey(const Key('to_tasks')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('to_details')), findsOneWidget);

      AppNavigation.resetDebounce();
      await tester.tap(find.byKey(const Key('to_details')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('back_btn')), findsOneWidget);

      // Back returns to /tasks
      await tester.tap(find.byKey(const Key('back_btn')));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('to_details')), findsOneWidget);

      // Pop returns to /dashboard
      final BuildContext currentContext = tester.element(find.byKey(const Key('to_details')));
      GoRouter.of(currentContext).pop();
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('to_tasks')), findsOneWidget);
    });
  });

  group('Multi-Attachment Unit Tests', () {
    test('TaskAttachment parses structured JSON and identifies file types', () {
      final jsonImage = {
        'id': 'att_101',
        'fileName': 'screenshot.PNG',
        'fileUrl': 'https://res.cloudinary.com/demo/image/upload/screenshot.png',
        'fileType': 'image',
        'fileSize': 1048576,
      };

      final attImage = TaskAttachment.fromJson(jsonImage);
      expect(attImage.id, equals('att_101'));
      expect(attImage.fileName, equals('screenshot.PNG'));
      expect(attImage.isImage, isTrue);
      expect(attImage.fileSize, equals(1048576));

      final jsonDoc = {
        '_id': 'att_102',
        'fileName': 'project_specs.docx',
        'fileUrl': 'https://res.cloudinary.com/demo/raw/upload/project_specs.docx',
        'fileType': 'document',
        'fileSize': 524288,
      };

      final attDoc = TaskAttachment.fromJson(jsonDoc);
      expect(attDoc.id, equals('att_102'));
      expect(attDoc.fileName, equals('project_specs.docx'));
      expect(attDoc.isImage, isFalse);
    });

    test('TaskAttachment supports backward-compatible legacy string and map formats', () {
      // Legacy string URL
      final stringAtt = TaskAttachment.fromJson('https://example.com/legacy_report.pdf');
      expect(stringAtt.fileName, equals('legacy_report.pdf'));
      expect(stringAtt.fileUrl, equals('https://example.com/legacy_report.pdf'));
      expect(stringAtt.isImage, isFalse);

      // Legacy single attachment field in TaskModel
      final legacyTaskJson = {
        'id': 'task_1',
        'title': 'Legacy Task',
        'description': 'Description',
        'status': 'Pending',
        'priority': 'Medium',
        'attachment': {
          'fileName': 'legacy_image.jpg',
          'fileUrl': 'https://example.com/legacy_image.jpg',
        }
      };

      final legacyTask = TaskModel.fromJson(legacyTaskJson);
      expect(legacyTask.attachments.length, equals(1));
      expect(legacyTask.attachments.first.fileName, equals('legacy_image.jpg'));
      expect(legacyTask.attachments.first.isImage, isTrue);
    });

    test('TaskModel parses multiple images and multiple documents correctly', () {
      final multiTaskJson = {
        'id': 'task_99',
        'title': 'Feature Release',
        'description': 'Full feature rollout with specs',
        'status': 'In Progress',
        'priority': 'High',
        'attachments': [
          {'id': '1', 'fileName': 'design1.jpg', 'fileUrl': 'http://test.com/design1.jpg', 'fileType': 'image'},
          {'id': '2', 'fileName': 'design2.png', 'fileUrl': 'http://test.com/design2.png', 'fileType': 'image'},
          {'id': '3', 'fileName': 'logo.webp', 'fileUrl': 'http://test.com/logo.webp', 'fileType': 'image'},
          {'id': '4', 'fileName': 'specs.pdf', 'fileUrl': 'http://test.com/specs.pdf', 'fileType': 'document'},
          {'id': '5', 'fileName': 'metrics.xlsx', 'fileUrl': 'http://test.com/metrics.xlsx', 'fileType': 'document'},
          {'id': '6', 'fileName': 'notes.txt', 'fileUrl': 'http://test.com/notes.txt', 'fileType': 'document'},
        ]
      };

      final task = TaskModel.fromJson(multiTaskJson);
      expect(task.attachments.length, equals(6));
      expect(task.attachments.where((a) => a.isImage).length, equals(3));
      expect(task.attachments.where((a) => !a.isImage).length, equals(3));
    });

    test('PickedAttachment detects image types and retains bytes', () {
      final imagePicked = PickedAttachment(
        name: 'screen.png',
        bytes: Uint8List.fromList([1, 2, 3]),
        size: 3,
        extension: 'png',
      );
      expect(imagePicked.isImage, isTrue);
      expect(imagePicked.bytes.length, equals(3));

      final docPicked = PickedAttachment(
        name: 'report.pdf',
        bytes: Uint8List.fromList([4, 5]),
        size: 2,
        extension: 'pdf',
      );
      expect(docPicked.isImage, isFalse);
    });
  });

  group('Country Code Dropdown Widget Tests', () {
    testWidgets('Country code dropdown opens below field, displays items, and selects country', (tester) async {
      final phoneController = TextEditingController();
      CountryInfo selectedCountry = CountryData.defaultCountry;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(20),
              child: StatefulBuilder(
                builder: (context, setState) {
                  return UnifiedPhoneInput(
                    controller: phoneController,
                    selectedCountry: selectedCountry,
                    onCountryChanged: (c) {
                      setState(() {
                        selectedCountry = c;
                      });
                    },
                  );
                },
              ),
            ),
          ),
        ),
      );

      // Verify initial country display (+91 India)
      expect(find.text('+91'), findsOneWidget);

      // Tap on the country code trigger to open dropdown
      await tester.tap(find.text('+91'));
      await tester.pumpAndSettle();

      // Dropdown menu is now open: check search field and countries are displayed
      expect(find.byType(TextField), findsNWidgets(2)); // phone input + dropdown search field
      expect(find.text('Search country or code...'), findsOneWidget);
      expect(find.text('(Afghanistan)'), findsOneWidget);

      // Verify that dropdown is positioned below the phone field
      final inputFinder = find.byType(UnifiedPhoneInput);
      final searchFinder = find.text('Search country or code...');
      final inputBottom = tester.getBottomLeft(inputFinder).dy;
      final searchTop = tester.getTopLeft(searchFinder).dy;
      expect(searchTop, greaterThanOrEqualTo(inputBottom - 10.0)); // Strictly below the input

      // Tap Afghanistan (+93) from list
      final afFinder = find.text('(Afghanistan)');
      expect(afFinder, findsOneWidget);
      await tester.tap(afFinder);
      await tester.pumpAndSettle();

      // Dropdown should be closed and selectedCountry should now be AF (+93)
      expect(selectedCountry.callingCode, equals('+93'));
      expect(find.text('Search country or code...'), findsNothing);
      expect(find.text('+93'), findsOneWidget);
    });
  });

  group('Navigation Transition Animation Direction Tests', () {
    testWidgets('Push transition enters from Right to Left', (tester) async {
      final router = GoRouter(
        initialLocation: '/first',
        routes: [
          GoRoute(
            path: '/first',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('First Screen')),
            ),
          ),
          GoRoute(
            path: '/second',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('Second Screen')),
            ),
          ),
        ],
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      expect(find.text('First Screen'), findsOneWidget);

      router.push('/second');
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 60));

      // Entering screen has dx > 0 (sliding in from the right)
      final slideTransitions = tester.widgetList<SlideTransition>(find.byType(SlideTransition)).toList();
      expect(slideTransitions.any((st) => st.position.value.dx > 0.0), isTrue);

      await tester.pumpAndSettle();
      expect(find.text('Second Screen'), findsOneWidget);
    });

    testWidgets('Pop transition exits from Left to Right', (tester) async {
      final router = GoRouter(
        initialLocation: '/first',
        routes: [
          GoRoute(
            path: '/first',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('First Screen')),
            ),
          ),
          GoRoute(
            path: '/second',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('Second Screen')),
            ),
          ),
        ],
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();

      router.push('/second');
      await tester.pumpAndSettle();
      expect(find.text('Second Screen'), findsOneWidget);

      // Pop the route
      router.pop();
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 60));

      // Exiting screen reverses towards dx > 0 (sliding out to the right)
      final slideTransitions = tester.widgetList<SlideTransition>(find.byType(SlideTransition)).toList();
      expect(slideTransitions.any((st) => st.position.value.dx > 0.0), isTrue);

      await tester.pumpAndSettle();
      expect(find.text('First Screen'), findsOneWidget);
      expect(find.text('Second Screen'), findsNothing);
    });

    testWidgets('Backward navigation with isBack: true enters from Left to Right', (tester) async {
      final router = GoRouter(
        initialLocation: '/register',
        routes: [
          GoRoute(
            path: '/register',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('Register Screen')),
            ),
          ),
          GoRoute(
            path: '/login',
            pageBuilder: (context, state) => buildAppPageTransition(
              context: context,
              state: state,
              child: const Scaffold(body: Text('Login Screen')),
            ),
          ),
        ],
      );

      await tester.pumpWidget(MaterialApp.router(routerConfig: router));
      await tester.pumpAndSettle();
      expect(find.text('Register Screen'), findsOneWidget);

      // Simulate reverse navigation (Register -> Login)
      router.go('/login', extra: const {'isBack': true});
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 60));

      // Entering Login Screen enters from the left (dx < 0)
      final slideTransitions = tester.widgetList<SlideTransition>(find.byType(SlideTransition)).toList();
      expect(slideTransitions.any((st) => st.position.value.dx < 0.0), isTrue);

      await tester.pumpAndSettle();
      expect(find.text('Login Screen'), findsOneWidget);
    });

    testWidgets('AppSlidePageTransitionsBuilder builds horizontal slide transitions', (tester) async {
      const builder = AppSlidePageTransitionsBuilder();
      late Widget builtWidget;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) {
              final route = MaterialPageRoute(builder: (_) => const Text('Target'));
              final anim = const AlwaysStoppedAnimation<double>(0.5);
              final secAnim = const AlwaysStoppedAnimation<double>(0.0);
              builtWidget = builder.buildTransitions(route, context, anim, secAnim, const Text('Target'));
              return Container();
            },
          ),
        ),
      );

      expect(builtWidget, isA<SlideTransition>());
      final outer = builtWidget as SlideTransition;
      expect(outer.child, isA<SlideTransition>());
      final inner = outer.child as SlideTransition;
      expect(inner.position.value.dx, greaterThan(0.0)); // Animating from 1.0 towards 0.0 at t=0.5
    });
  });
}

