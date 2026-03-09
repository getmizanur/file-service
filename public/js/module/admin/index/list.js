// Rich Text Editor for textareas
(function () {
  'use strict';

  /**
   * Rich Text Editor - Markdown-based editor with toolbar
   */
  class RichTextEditor {
    constructor(textarea) {
      this.textarea = textarea;
      this.toolbar = null;
      this.preview = null;
      this.tabs = null;
      this.currentTab = 'edit';
      // Check if this is basic or advanced mode
      this.mode = textarea.dataset.editorMode || 'advanced';

      this.init();
    }

    init() {
      // Wrap textarea and create toolbar
      this.wrapTextarea();
      this.createTabs();
      this.createToolbar();
      this.createPreview();
      this.attachEventListeners();
    }

    wrapTextarea() {
      const wrapper = document.createElement('div');
      wrapper.className = 'dp-rte';
      this.textarea.parentNode.insertBefore(wrapper, this.textarea);
      wrapper.appendChild(this.textarea);
      this.textarea.classList.add('dp-rte__textarea');
    }

    createTabs() {
      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'dp-rte__tabs';
      tabsContainer.innerHTML = `
                <button type="button" class="dp-rte__tab dp-rte__tab--active" data-tab="edit">Edit</button>
                <button type="button" class="dp-rte__tab" data-tab="preview">Preview</button>
            `;

      this.textarea.parentNode.insertBefore(tabsContainer, this.textarea);
      this.tabs = tabsContainer;
    }

    createToolbar() {
      const toolbar = document.createElement('div');
      toolbar.className = 'dp-rte-toolbar';

      // Basic toolbar (Bold and Italic only)
      const basicToolbar = `
                <div class="dp-rte-toolbar__group">
                    <button type="button" class="dp-rte-toolbar__button dp-rte-toolbar__button--bold" data-action="bold" title="Bold (Ctrl+B)">
                        <strong>B</strong>
                    </button>
                    <button type="button" class="dp-rte-toolbar__button dp-rte-toolbar__button--italic" data-action="italic" title="Italic (Ctrl+I)">
                        <em>I</em>
                    </button>
                </div>
            `;

      // Advanced toolbar (all features)
      const advancedToolbar = `
                <div class="dp-rte-toolbar__group">
                    <button type="button" class="dp-rte-toolbar__button dp-rte-toolbar__button--bold" data-action="bold" title="Bold (Ctrl+B)">
                        <strong>B</strong>
                    </button>
                    <button type="button" class="dp-rte-toolbar__button dp-rte-toolbar__button--italic" data-action="italic" title="Italic (Ctrl+I)">
                        <em>I</em>
                    </button>
                </div>
                <div class="dp-rte-toolbar__group">
                    <button type="button" class="dp-rte-toolbar__button" data-action="heading2" title="Heading 2">
                        H2
                    </button>
                    <button type="button" class="dp-rte-toolbar__button" data-action="heading3" title="Heading 3">
                        H3
                    </button>
                </div>
                <div class="dp-rte-toolbar__group">
                    <button type="button" class="dp-rte-toolbar__button" data-action="link" title="Insert Link (Ctrl+K)">
                        Link
                    </button>
                    <button type="button" class="dp-rte-toolbar__button" data-action="quote" title="Quote">
                        Quote
                    </button>
                    <button type="button" class="dp-rte-toolbar__button" data-action="unorderedList" title="Bullet List">
                        • List
                    </button>
                </div>
                <div class="dp-rte-toolbar__group">
                    <button type="button" class="dp-rte-toolbar__button" data-action="youtube" title="Embed YouTube">
                        YouTube
                    </button>
                    <button type="button" class="dp-rte-toolbar__button" data-action="rumble" title="Embed Rumble">
                        Rumble
                    </button>
                    <button type="button" class="dp-rte-toolbar__button" data-action="odysee" title="Embed Odysee">
                        Odysee
                    </button>
                    <!-- Twitter/X embed disabled - uncomment to enable
                    <button type="button" class="dp-rte-toolbar__button" data-action="twitter" title="Embed Twitter/X">
                        X
                    </button>
                    -->
                </div>
            `;

      toolbar.innerHTML = this.mode === 'basic' ? basicToolbar : advancedToolbar;

      this.textarea.parentNode.insertBefore(toolbar, this.textarea);
      this.toolbar = toolbar;
    }

    createPreview() {
      const preview = document.createElement('div');
      preview.className = 'dp-rte__preview';
      this.textarea.parentNode.appendChild(preview);
      this.preview = preview;
    }

    attachEventListeners() {
      // Toolbar button clicks
      this.toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('.dp-rte-toolbar__button');
        if (button) {
          e.preventDefault();
          const action = button.dataset.action;
          this.handleAction(action);
        }
      });

      // Tab clicks
      this.tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.dp-rte__tab');
        if (tab) {
          e.preventDefault();
          const tabName = tab.dataset.tab;
          this.switchTab(tabName);
        }
      });

      // Keyboard shortcuts
      this.textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'b':
              e.preventDefault();
              this.handleAction('bold');
              break;
            case 'i':
              e.preventDefault();
              this.handleAction('italic');
              break;
            case 'k':
              e.preventDefault();
              this.handleAction('link');
              break;
          }
        }
      });

      // Auto-resize textarea
      this.textarea.addEventListener('input', () => {
        this.autoResize();
      });

      // Initial resize
      this.autoResize();
    }

    autoResize() {
      // Reset height to auto to get the correct scrollHeight
      this.textarea.style.height = 'auto';

      // Set height to scrollHeight (content height)
      const newHeight = Math.max(300, this.textarea.scrollHeight);
      this.textarea.style.height = newHeight + 'px';
    }

    handleAction(action) {
      const start = this.textarea.selectionStart;
      const end = this.textarea.selectionEnd;
      const selectedText = this.textarea.value.substring(start, end);
      const beforeText = this.textarea.value.substring(0, start);
      const afterText = this.textarea.value.substring(end);

      const result = this._resolveActionMarkup(action, selectedText);
      if (!result) return; // User cancelled or invalid input

      // Update textarea value
      this.textarea.value = beforeText + result.text + afterText;

      // Set cursor position
      const newCursorPos = start + result.offset;
      this.textarea.setSelectionRange(newCursorPos, newCursorPos);
      this.textarea.focus();
    }

    _resolveActionMarkup(action, selectedText) {
      switch (action) {
        case 'bold':        return this._wrapMarkup(selectedText, '**', 'bold text');
        case 'italic':      return this._wrapMarkup(selectedText, '*', 'italic text');
        case 'heading2':    return this._prefixMarkup(selectedText, '## ', 'Heading 2');
        case 'heading3':    return this._prefixMarkup(selectedText, '### ', 'Heading 3');
        case 'link':        return this._buildLinkMarkup(selectedText);
        case 'unorderedList': return this._listMarkup(selectedText, () => '- ');
        case 'orderedList':   return this._listMarkup(selectedText, (_, i) => `${i + 1}. `);
        case 'quote':         return this._listMarkup(selectedText, () => '> ', 'Quote text');
        case 'youtube':     return this._promptEmbed('Enter YouTube URL or video ID:', selectedText, this._extractYoutubeId);
        case 'rumble':      return this._promptEmbed('Enter Rumble embed URL (e.g., https://rumble.com/embed/v72n4s6/?pub=4):', selectedText, this._extractRumbleId);
        case 'odysee':      return this._promptEmbed('Enter Odysee URL or video ID:', selectedText, this._extractOdyseeId);
        case 'twitter':     return this._promptEmbed('Enter Twitter/X URL (e.g., https://x.com/username/status/123456789):', selectedText, this._extractTwitterId);
        default:            return null;
      }
    }

    _wrapMarkup(selectedText, wrapper, placeholder) {
      const text = `${wrapper}${selectedText || placeholder}${wrapper}`;
      return { text, offset: selectedText ? text.length : wrapper.length };
    }

    _prefixMarkup(selectedText, prefix, placeholder) {
      const text = `${prefix}${selectedText || placeholder}`;
      return { text, offset: text.length };
    }

    _buildLinkMarkup(selectedText) {
      const url = selectedText.startsWith('http') ? selectedText : 'https://example.com';
      const linkText = selectedText.startsWith('http') ? 'link text' : (selectedText || 'link text');
      const text = `[${linkText}](${url})`;
      return { text, offset: text.length };
    }

    _listMarkup(selectedText, prefixFn, placeholder) {
      let text;
      if (selectedText) {
        const lines = selectedText.split('\n');
        text = lines.map((line, i) => `${prefixFn(line, i)}${line}`).join('\n');
      } else {
        text = `${prefixFn('', 0)}${placeholder || 'List item'}`;
      }
      return { text, offset: text.length };
    }

    _promptEmbed(message, selectedText, extractFn) {
      const input = prompt(message);
      if (!input) return null;
      const result = extractFn(input);
      if (!result) return null;
      return { text: result, offset: result.length };
    }

    _extractYoutubeId(input) {
      let videoId = input;
      if (input.includes('youtube.com/watch?v=')) {
        videoId = input.split('watch?v=')[1].split('&')[0];
      } else if (input.includes('youtu.be/')) {
        videoId = input.split('youtu.be/')[1].split('?')[0];
      }
      return `[youtube:${videoId}]`;
    }

    _extractRumbleId(input) {
      const match = input.match(/rumble\.com\/embed\/([^/?]+)/);
      if (!match) {
        alert('Invalid Rumble URL. Please use the embed URL format:\nhttps://rumble.com/embed/{video_id}/?pub=4\n\nExample: https://rumble.com/embed/v72n4s6/?pub=4');
        return null;
      }
      return `[rumble:${match[1]}]`;
    }

    _extractOdyseeId(input) {
      let odyseeId = input;
      if (input.includes('odysee.com/')) {
        const match = input.match(/odysee\.com\/(@[^/]+\/[^?]+)/);
        if (match) odyseeId = match[1];
      }
      return `[odysee:${odyseeId}]`;
    }

    _extractTwitterId(input) {
      const match = input.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
      if (!match) {
        alert('Invalid Twitter/X URL. Please use the format:\nhttps://x.com/username/status/123456789\nor\nhttps://twitter.com/username/status/123456789');
        return null;
      }
      return `[twitter:https://x.com/${match[1]}/status/${match[2]}]`;
    }

    switchTab(tabName) {
      // Update tab buttons
      this.tabs.querySelectorAll('.dp-rte__tab').forEach(tab => {
        tab.classList.toggle('dp-rte__tab--active', tab.dataset.tab === tabName);
      });

      this.currentTab = tabName;

      if (tabName === 'preview') {
        // Show preview, hide textarea and toolbar
        this.textarea.style.display = 'none';
        this.toolbar.style.display = 'none';
        this.preview.classList.add('dp-rte__preview--active');
        this.updatePreview();
      } else {
        // Show textarea and toolbar, hide preview
        this.textarea.style.display = 'block';
        this.toolbar.style.display = 'flex';
        this.preview.classList.remove('dp-rte__preview--active');
      }
    }

    updatePreview() {
      // Simple markdown to HTML conversion
      let html = this.textarea.value;

      // YouTube embeds
      html = html.replace(/\[youtube:([^\]]+)\]/g, (match, videoId) => {
        return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 16px 0;">
                    <iframe src="https://www.youtube.com/embed/${videoId}"
                            title="YouTube video player"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                    </iframe>
                </div>`;
      });

      // Rumble embeds
      html = html.replace(/\[rumble:([^\]]+)\]/g, (match, videoId) => {
        return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 16px 0;">
                    <iframe src="https://rumble.com/embed/${videoId}"
                            title="Rumble video player"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                            frameborder="0"
                            allowfullscreen>
                    </iframe>
                </div>`;
      });

      // Odysee embeds
      html = html.replace(/\[odysee:([^\]]+)\]/g, (match, videoId) => {
        return `<div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 16px 0;">
                    <iframe src="https://odysee.com/$/embed/${videoId}"
                            title="Odysee video player"
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                            frameborder="0"
                            allowfullscreen>
                    </iframe>
                </div>`;
      });

      // Twitter embeds
      html = html.replace(/\[twitter:([^\]]+)\]/g, (match, url) => {
        return `<blockquote class="twitter-tweet" data-dnt="true"><a href="${url}">${url}</a></blockquote>`;
      });

      // Quotes
      html = html.replace(/^> (.*)$/gim, '<blockquote style="border-left: 4px solid #b1b4b6; padding-left: 16px; margin: 16px 0; color: #505a5f;">$1</blockquote>');

      // Headings
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');

      // Bold
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Italic
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

      // Unordered lists
      html = html.replace(/^- (.*)$/gim, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

      // Ordered lists
      html = html.replace(/^\d+\. (.*)$/gim, '<li>$1</li>');

      // Paragraphs
      html = html.split('\n\n').map(para => {
        if (!para.match(/^<(h2|h3|ul|ol|li|blockquote|div)/)) {
          return `<p>${para}</p>`;
        }
        return para;
      }).join('\n');

      this.preview.innerHTML = html;

      // Render Twitter embeds if widgets.js is loaded
      if (window.twttr?.widgets) {
        window.twttr.widgets.load(this.preview);
      }
    }
  }

  // Initialize RTE on textareas with 'dp-markdown-editor' class
  function initRichTextEditors() {
    const textareas = document.querySelectorAll('textarea.dp-markdown-editor');
    textareas.forEach(textarea => {
      // Skip if already initialized
      if (textarea.classList.contains('dp-rte__textarea')) {
        return;
      }

      new RichTextEditor(textarea); // NOSONAR — instance manages its own lifecycle
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRichTextEditors);
  } else {
    initRichTextEditors();
  }
})();