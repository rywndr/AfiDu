document.addEventListener('DOMContentLoaded', function() {
  // student data for autocomplete
  const students = window.studentData || [];
  
  const studentSearchInput = document.getElementById('student_search');
  const studentIdsInput = document.getElementById('student_ids');
  const searchResults = document.getElementById('student_search_results');
  const selectedStudentsDisplay = document.getElementById('selected_students_display');
  const selectAllStudentsCheckbox = document.getElementById('select_all_students');
  const classFilterSelect = document.getElementById('class_filter');
  const levelFilterSelect = document.getElementById('level_filter');
  
  // array to keep track of selected students
  let selectedStudents = [];
  
  // func to filter students based on search term and filters
  function filterStudents(searchTerm) {
    searchTerm = searchTerm ? searchTerm.toLowerCase() : '';
    const classFilter = classFilterSelect.value;
    const levelFilter = levelFilterSelect.value;
    
    // filter out already selected students and match search term
    return students.filter(student => 
      !selectedStudents.some(s => s.id === student.id) &&
      (searchTerm === '' || 
       student.name.toLowerCase().includes(searchTerm) || 
       student.level.toLowerCase().includes(searchTerm) ||
       student.class.toLowerCase().includes(searchTerm)) &&
      (classFilter === '' || student.class === document.querySelector(`#class_filter option[value="${classFilter}"]`)?.textContent) &&
      (levelFilter === '' || student.level === levelFilter)
    );
  }
  
  // func to apply filters and populate student search results
  function applyFilters() {
    const classFilter = classFilterSelect.value;
    const levelFilter = levelFilterSelect.value;
    
    // if any filter is selected, uncheck "include all students"
    if (classFilter !== '' || levelFilter !== '') {
      selectAllStudentsCheckbox.checked = false;
      
      // show filtered students in search results
      const filteredStudents = filterStudents('');
      if (filteredStudents.length > 0) {
        updateSearchResults(filteredStudents);
        searchResults.classList.remove('hidden');
      }
    }
  }
  
  // func to update search results
  function updateSearchResults(filteredStudents) {
    searchResults.innerHTML = '';
    
    if (filteredStudents.length === 0) {
      const noResultsItem = document.createElement('div');
      noResultsItem.className = 'px-3 py-2 text-sm text-gray-500 italic';
      noResultsItem.textContent = 'No students found';
      searchResults.appendChild(noResultsItem);
    } else {
      filteredStudents.forEach(student => {
        const resultItem = document.createElement('div');
        resultItem.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-gray-100';
        resultItem.textContent = `${student.name} | ${student.class} | ${student.level}`;
        resultItem.dataset.id = student.id;
        resultItem.dataset.name = student.name;
        resultItem.dataset.level = student.level;
        resultItem.dataset.class = student.class;
        
        resultItem.addEventListener('click', function() {
          addStudent(student);
        });
        
        searchResults.appendChild(resultItem);
      });
    }
    
    searchResults.classList.remove('hidden');
  }
  
  // func to add a student to selected students
  function addStudent(student) {
    // check if student is already selected
    if (selectedStudents.some(s => s.id === student.id)) {
      return;
    }
    
    // add to selected students array
    selectedStudents.push(student);
    
    // update hidden input value
    updateStudentIdsInput();
    
    // create student tag element
    const studentTag = document.createElement('div');
    studentTag.className = 'inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800';
    studentTag.dataset.id = student.id;
    
    const studentNameSpan = document.createElement('span');
    studentNameSpan.textContent = `${student.name} | ${student.class} | ${student.level}`;
    
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'ml-1 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none';
    removeButton.innerHTML = `
      <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    `;
    
    removeButton.addEventListener('click', function() {
      removeStudent(student.id);
    });
    
    studentTag.appendChild(studentNameSpan);
    studentTag.appendChild(removeButton);
    
    selectedStudentsDisplay.appendChild(studentTag);
    
    // hide search results and clear search input
    searchResults.classList.add('hidden');
    studentSearchInput.value = '';
    
    // uncheck "all students" checkbox when specific students are selected
    selectAllStudentsCheckbox.checked = false;
  }
  
  // func to remove a student from selected students
  function removeStudent(studentId) {
    // remove from array
    selectedStudents = selectedStudents.filter(student => student.id !== studentId);
    
    // update hidden input value
    updateStudentIdsInput();
    
    // remove from display
    const studentTag = selectedStudentsDisplay.querySelector(`[data-id="${studentId}"]`);
    if (studentTag) {
      selectedStudentsDisplay.removeChild(studentTag);
    }
    
    // if no student selected, check "all students" checkbox
    if (selectedStudents.length === 0) {
      selectAllStudentsCheckbox.checked = true;
    }
  }
  
  // func to update the hidden input with selected student IDs
  function updateStudentIdsInput() {
    const ids = selectedStudents.map(student => student.id);
    studentIdsInput.value = ids.join(',');
  }
  
  // func to clear all selected students
  function clearAllStudents() {
    selectedStudents = [];
    updateStudentIdsInput();
    selectedStudentsDisplay.innerHTML = '';
  }
  
  // event listeners
  studentSearchInput.addEventListener('input', function() {
    const searchTerm = this.value.trim();
    
    if (searchTerm.length < 2) {
      searchResults.classList.add('hidden');
      return;
    }
    
    const filteredStudents = filterStudents(searchTerm);
    updateSearchResults(filteredStudents);
  });
  
  studentSearchInput.addEventListener('focus', function() {
    const searchTerm = this.value.trim();
    
    if (searchTerm.length >= 2) {
      const filteredStudents = filterStudents(searchTerm);
      updateSearchResults(filteredStudents);
    }
  });
  
  classFilterSelect.addEventListener('change', applyFilters);
  levelFilterSelect.addEventListener('change', applyFilters);
  
  // close results when clicking outside
  document.addEventListener('click', function(e) {
    if (!studentSearchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.add('hidden');
    }
  });
  
  // handle "select all students" checkbox
  selectAllStudentsCheckbox.addEventListener('change', function() {
    if (this.checked) {
      clearAllStudents();
    }
  });
});