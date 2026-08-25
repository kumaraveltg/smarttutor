// One entry per admin entity. CrudTable and CrudForm read this config to
// render list + add/edit screens for every entity below — adding a new
// admin screen means adding an entry here, not writing a new page.
export const entities = {
  users: {
    label: 'Users',
    resource: 'users',
    columns: [
      { key: 'username', label: 'Username' },
      { key: 'full_name', label: 'Full name' },
      { key: 'role', label: 'Role' },
      { key: 'is_active', label: 'Active' },
    ],
    fields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'full_name', label: 'Full name', type: 'text' },
      { key: 'role', label: 'Role', type: 'select', options: ['admin', 'teacher', 'student'] },
      { key: 'password', label: 'Password', type: 'password', createOnly: true },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },
  roles: {
    label: 'User Roles',
    resource: 'roles',
    columns: [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
    ],
    fields: [
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'name', label: 'Name', type: 'text', required: true },
    ],
  },
  lov: {
    label: 'List of Values',
    resource: 'lov',
    columns: [
      { key: 'category', label: 'Category' },
      { key: 'code', label: 'Code' },
      { key: 'value', label: 'Value' },
    ],
    fields: [
      { key: 'category', label: 'Category', type: 'text', required: true },
      { key: 'code', label: 'Code', type: 'text', required: true },
      { key: 'value', label: 'Value', type: 'text', required: true },
    ],
  },

  // ---------- New: Chapter ----------
  chapter: {
    label: 'Chapters',
    resource: 'chapters',
    idKey: 'chapter_id', // primary key isn't called `id` on this table — see CrudTable note
    columns: [
      { key: 'chapter_no', label: 'Chapter No' },
      { key: 'title_en', label: 'Title' },
      { key: 'sort_order', label: 'Sort' },
      { key: 'is_active', label: 'Active' },
    ],
    fields: [
      {
        key: 'board_lov_id',
        label: 'Board',
        type: 'dynamicSelect',
        required: true,
        // Fetches all LOV rows once and filters client-side — avoids needing
        // to know whether adminApi.list() supports server-side query params.
        source: { resource: 'lov', filter: (row) => row.category === 'BOARD' },
        valueKey: 'id',
        labelKey: 'value',
      },
      {
        key: 'class_lov_id',
        label: 'Class',
        type: 'dynamicSelect',
        required: true,
        source: { resource: 'lov', filter: (row) => row.category === 'CLASS' },
        valueKey: 'id',
        labelKey: 'value',
      },
      {
        key: 'medium_lov_id',
        label: 'Medium',
        type: 'dynamicSelect',
        required: true,
        source: { resource: 'lov', filter: (row) => row.category === 'MEDIUM' },
        valueKey: 'id',
        labelKey: 'value',
      },
      {
        key: 'subject_lov_id',
        label: 'Subject',
        type: 'dynamicSelect',
        required: true,
        source: { resource: 'lov', filter: (row) => row.category === 'SUBJECT' },
        valueKey: 'id',
        labelKey: 'value',
      },
      { key: 'chapter_no', label: 'Chapter No', type: 'text', required: true },
      { key: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },

  // ---------- New: Subchapter ----------
  subchapter: {
    label: 'Subchapters',
    resource: 'subchapters',
    idKey: 'subchapter_id',
    columns: [
      { key: 'subchapter_no', label: 'Subchapter No' },
      { key: 'title_en', label: 'Title' },
      { key: 'sort_order', label: 'Sort' },
      { key: 'is_active', label: 'Active' },
    ],
    fields: [
      {
        key: 'chapter_id',
        label: 'Chapter',
        type: 'dynamicSelect',
        required: true,
        // No filter — every chapter is a valid parent for a subchapter.
        source: { resource: 'chapters' },
        valueKey: 'chapter_id',
        // labelFn takes priority over labelKey when both could apply —
        // lets the dropdown show "1 - Real Numbers" instead of just an id.
        labelFn: (row) => `${row.chapter_no} - ${row.title_en}`,
      },
      { key: 'subchapter_no', label: 'Subchapter No', type: 'text', required: true },
      { key: 'title_en', label: 'Title (English)', type: 'text', required: true },
      { key: 'sort_order', label: 'Sort order', type: 'number' },
      { key: 'is_active', label: 'Active', type: 'checkbox' },
    ],
  },

  questions: {
    label: 'Questions',
    resource: 'questions',
    columns: [
      { key: 'chapter', label: 'Chapter' },
      { key: 'title', label: 'Title' },
      { key: 'difficulty', label: 'Difficulty' },
    ],
    fields: [
      { key: 'chapter', label: 'Chapter', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'body', label: 'Question text', type: 'textarea', required: true },
      { key: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Medium', 'Hard'] },
    ],
  },
  answers: {
    label: 'Answers',
    resource: 'answers',
    columns: [
      { key: 'question_id', label: 'Question ID' },
      { key: 'method_label', label: 'Method' },
    ],
    fields: [
      { key: 'question_id', label: 'Question ID', type: 'text', required: true },
      { key: 'method_label', label: 'Method label', type: 'text' },
      { key: 'steps', label: 'Solution steps', type: 'textarea', required: true },
      { key: 'final_answer', label: 'Final answer', type: 'text', required: true },
    ],
  },
}
