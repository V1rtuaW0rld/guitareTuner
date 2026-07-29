export function initCustomSelect(selectId) {
  const originalSelect = document.getElementById(selectId);
  if (!originalSelect) return;

  // Prevent double initialization
  if (originalSelect.parentNode.classList.contains('custom-select-wrapper')) return;

  // Hide the original select completely
  originalSelect.style.display = 'none';

  // Create the custom wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper';
  originalSelect.parentNode.insertBefore(wrapper, originalSelect);
  wrapper.appendChild(originalSelect);

  // Create the trigger button
  const trigger = document.createElement('div');
  trigger.className = 'custom-select-trigger';
  
  const triggerText = document.createElement('span');
  triggerText.className = 'custom-select-text';
  triggerText.textContent = originalSelect.options[originalSelect.selectedIndex].text;
  
  const triggerIcon = document.createElement('span');
  triggerIcon.className = 'custom-select-icon';
  triggerIcon.innerHTML = '▼';
  
  trigger.appendChild(triggerText);
  trigger.appendChild(triggerIcon);
  wrapper.appendChild(trigger);

  // Create the dropdown menu
  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  
  // Populate the menu
  Array.from(originalSelect.children).forEach(child => {
    if (child.tagName === 'OPTGROUP') {
      const groupTitle = document.createElement('div');
      groupTitle.className = 'custom-select-optgroup-label';
      groupTitle.textContent = child.label;
      menu.appendChild(groupTitle);
      
      Array.from(child.children).forEach(option => {
        createCustomOption(option, menu, originalSelect, triggerText);
      });
    } else if (child.tagName === 'OPTION') {
      createCustomOption(child, menu, originalSelect, triggerText);
    }
  });

  wrapper.appendChild(menu);

  // Toggle menu on click
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Close other open selects
    document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
      if (w !== wrapper) w.classList.remove('open');
    });
    
    wrapper.classList.toggle('open');
    
    // Scroll to selected item if opening
    if (wrapper.classList.contains('open')) {
      const selectedItem = menu.querySelector('.custom-select-option.selected');
      if (selectedItem) {
        // Center the selected item in the menu view
        setTimeout(() => {
          menu.scrollTop = selectedItem.offsetTop - menu.clientHeight / 2 + selectedItem.clientHeight / 2;
        }, 10);
      }
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', () => {
    wrapper.classList.remove('open');
  });
}

function createCustomOption(option, menu, originalSelect, triggerText) {
  const item = document.createElement('div');
  item.className = 'custom-select-option';
  if (option.selected) {
    item.classList.add('selected');
  }
  item.textContent = option.text;
  item.dataset.value = option.value;
  
  item.addEventListener('click', (e) => {
    e.stopPropagation();
    // Update original select
    originalSelect.value = option.value;
    triggerText.textContent = option.text;
    
    // Dispatch change event on original select
    originalSelect.dispatchEvent(new Event('change'));
    
    // Update selected class
    Array.from(menu.querySelectorAll('.custom-select-option')).forEach(opt => opt.classList.remove('selected'));
    item.classList.add('selected');
    
    // Close menu
    menu.closest('.custom-select-wrapper').classList.remove('open');
  });
  
  menu.appendChild(item);
}
