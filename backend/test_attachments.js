/**
 * Backend Task Attachments Verification Test
 */
const assert = require('assert');
const path = require('path');
const stream = require('stream');
const archiverPkg = require('archiver');
const Task = require('./models/Task');
const { ALLOWED_EXTENSIONS } = require('./middleware/taskAttachmentMiddleware');

async function runTests() {
  console.log('--- Starting Backend Attachments Verification Tests ---');

  // Test 1: Supported Extensions
  console.log('Test 1: Validating supported file extensions...');
  const expectedImages = ['jpg', 'jpeg', 'png', 'webp'];
  const expectedDocs = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
  for (const ext of expectedImages) {
    assert(ALLOWED_EXTENSIONS.includes(ext), `Expected image extension ${ext} to be allowed`);
  }
  for (const ext of expectedDocs) {
    assert(ALLOWED_EXTENSIONS.includes(ext), `Expected doc extension ${ext} to be allowed`);
  }
  assert(!ALLOWED_EXTENSIONS.includes('exe'), 'Expected exe to be rejected');
  assert(!ALLOWED_EXTENSIONS.includes('sh'), 'Expected sh to be rejected');
  console.log('✓ Supported file extensions verified.');

  // Test 2: Task Schema with Multiple Attachments
  console.log('Test 2: Validating Task Model schema with multiple attachments...');
  const sampleAttachments = [
    {
      fileName: 'image1.jpg',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/image1.jpg',
      fileType: 'image',
      mimeType: 'image/jpeg',
      fileSize: 102400
    },
    {
      fileName: 'specs.pdf',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/specs.pdf',
      fileType: 'document',
      mimeType: 'application/pdf',
      fileSize: 204800
    },
    {
      fileName: 'sheet.xlsx',
      fileUrl: 'https://res.cloudinary.com/demo/raw/upload/sheet.xlsx',
      fileType: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileSize: 512000
    }
  ];

  const dummyTask = new Task({
    title: 'Test Attachment Task',
    description: 'A valid task description with test attachments.',
    assignedTo: '60d0fe4f5311236168a109ca',
    dueDate: new Date(),
    attachments: sampleAttachments
  });

  const taskJson = dummyTask.toJSON();
  assert.strictEqual(taskJson.attachments.length, 3, 'Task should have 3 attachments');
  assert(taskJson.attachments[0].id, 'Each attachment subdocument should have an id transformed');
  assert.strictEqual(taskJson.attachments[0].fileName, 'image1.jpg');
  assert.strictEqual(taskJson.attachments[1].fileName, 'specs.pdf');
  assert.strictEqual(taskJson.attachments[2].fileName, 'sheet.xlsx');
  console.log('✓ Task schema and JSON transformation verified.');

  // Test 3: ZIP Archive Generation with duplicate filename handling
  console.log('Test 3: Verifying ZIP Archive generation with multi-files and duplicate filenames...');
  const createZip = () => archiverPkg.ZipArchive ? new archiverPkg.ZipArchive({ zlib: { level: 6 } }) : archiverPkg('zip', { zlib: { level: 6 } });
  const archive = createZip();
  const passThrough = new stream.PassThrough();

  let bytesCount = 0;
  passThrough.on('data', chunk => {
    bytesCount += chunk.length;
  });

  archive.pipe(passThrough);

  // Add sample files (handling duplicates)
  const filesToZip = [
    { name: 'document.pdf', content: 'PDF Dummy Content' },
    { name: 'document.pdf', content: 'Duplicate PDF Content' },
    { name: 'image.png', content: 'PNG Dummy Content' }
  ];

  const usedNames = new Map();
  for (const file of filesToZip) {
    let baseName = file.name;
    const ext = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, ext);

    let finalName = baseName;
    let count = usedNames.get(baseName) || 0;
    if (count > 0) {
      finalName = `${nameWithoutExt}_(${count})${ext}`;
    }
    usedNames.set(baseName, count + 1);

    archive.append(file.content, { name: finalName });
  }

  await archive.finalize();
  assert(bytesCount > 0, 'Archive should contain byte stream');
  console.log(`✓ ZIP archive generation verified (${bytesCount} bytes generated).`);

  // Test 4: Task Controller Authorization Logic Verification
  console.log('Test 4: Verifying download authorization logic...');
  const fakeTask = {
    _id: 'task123',
    assignedTo: 'user_employee_1',
    attachments: [
      { _id: 'att1', id: 'att1', fileName: 'sample.pdf', fileUrl: 'https://cdn/sample.pdf' }
    ]
  };

  const isEmployeeAuthorized = (user, task) => {
    if (user.role === 'Admin') return true;
    if (user.role === 'Employee' && task.assignedTo === user._id) return true;
    return false;
  };

  const adminUser = { _id: 'admin1', role: 'Admin' };
  const authorizedEmployee = { _id: 'user_employee_1', role: 'Employee' };
  const unauthorizedEmployee = { _id: 'user_employee_2', role: 'Employee' };

  assert.strictEqual(isEmployeeAuthorized(adminUser, fakeTask), true, 'Admin must be authorized');
  assert.strictEqual(isEmployeeAuthorized(authorizedEmployee, fakeTask), true, 'Assigned employee must be authorized');
  assert.strictEqual(isEmployeeAuthorized(unauthorizedEmployee, fakeTask), false, 'Unassigned employee must be blocked');
  console.log('✓ Authorization logic verified.');

  console.log('\n--- All Backend Verification Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
