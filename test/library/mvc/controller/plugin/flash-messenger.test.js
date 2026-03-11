const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../../../');
global.applicationPath = (p) => path.join(projectRoot, p.replace(/^\//, ''));

const FlashMessenger = require(path.join(projectRoot, 'library/mvc/controller/plugin/flash-messenger'));
const Session = require(path.join(projectRoot, 'library/session/session'));

describe('FlashMessenger Plugin', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });
  afterAll(() => {
    console.warn.mockRestore();
    console.debug.mockRestore();
  });

  beforeEach(() => {
    Session.start();
  });

  afterEach(() => {
    try { Session.destroy(); } catch (e) { /* ignore */ }
  });

  describe('constructor', () => {
    it('should create with default namespace', () => {
      const fm = new FlashMessenger();
      expect(fm.namespace).toBe('FlashMessenger');
      expect(fm.messageAdded).toBe(false);
    });

    it('should accept custom namespace', () => {
      const fm = new FlashMessenger({ namespace: 'Custom' });
      expect(fm.namespace).toBe('Custom');
    });

    it('should initialize message buckets', () => {
      const fm = new FlashMessenger();
      expect(fm.messages.default).toEqual([]);
      expect(fm.messages.success).toEqual([]);
      expect(fm.messages.error).toEqual([]);
    });
  });

  describe('namespace helpers', () => {
    it('should set/get/reset namespace', () => {
      const fm = new FlashMessenger();
      fm.setNamespace('error');
      expect(fm.getNamespace()).toBe('error');
      fm.resetNamespace();
      expect(fm.getNamespace()).toBe('default');
    });

    it('setNamespace should return this', () => {
      const fm = new FlashMessenger();
      expect(fm.setNamespace('info')).toBe(fm);
    });

    it('getContainer should return null (deprecated)', () => {
      const fm = new FlashMessenger();
      expect(fm.getContainer()).toBeNull();
    });
  });

  describe('key helpers', () => {
    it('should generate current/next keys', () => {
      const fm = new FlashMessenger();
      expect(fm._keyCurrent('error')).toBe('error_current');
      expect(fm._keyNext('error')).toBe('error_next');
    });

    it('should list all namespaces', () => {
      const fm = new FlashMessenger();
      const ns = fm._allNamespaces();
      expect(ns).toContain('default');
      expect(ns).toContain('success');
      expect(ns).toContain('warning');
      expect(ns).toContain('error');
      expect(ns).toContain('info');
    });
  });

  describe('addMessage', () => {
    it('should add message to default namespace', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('Hello');
      expect(fm.messageAdded).toBe(true);
      expect(fm.messages.default).toContain('Hello');
    });

    it('should add message to specific namespace', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('Error!', 'error');
      expect(fm.messages.error).toContain('Error!');
    });

    it('should return this for chaining', () => {
      const fm = new FlashMessenger();
      expect(fm.addInfoMessage('info')).toBe(fm);
      expect(fm.addSuccessMessage('ok')).toBe(fm);
      expect(fm.addWarningMessage('warn')).toBe(fm);
      expect(fm.addErrorMessage('err')).toBe(fm);
    });

    it('should add to custom namespace not in initial map', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('Custom', 'custom');
      expect(fm.messages.custom).toContain('Custom');
    });
  });

  describe('hasMessages / getMessages', () => {
    it('should detect messages in session', async () => {
      const fm = new FlashMessenger();
      expect(fm.hasMessages()).toBe(false);
      await fm.addMessage('test');
      expect(fm.hasMessages()).toBe(true);
    });

    it('should retrieve and clear messages by default', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('msg1');
      await fm.addMessage('msg2');
      const msgs = fm.getMessages();
      expect(msgs).toContain('msg1');
      expect(msgs).toContain('msg2');
      // After read with clear, should be empty
      const again = fm.getMessages();
      expect(again).toEqual([]);
    });

    it('should not clear when clearAfterRead is false', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('persist');
      fm.getMessages('default', false);
      expect(fm.getMessages('default', false).length).toBeGreaterThan(0);
    });
  });

  describe('getAllMessages', () => {
    it('should return messages for all namespaces', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('err', 'error');
      await fm.addMessage('ok', 'success');
      const all = fm.getAllMessages();
      expect(all.errors).toContain('err');
      expect(all.success).toContain('ok');
    });
  });

  describe('clearMessages / clearAllMessages', () => {
    it('should clear specific namespace', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('msg', 'error');
      fm.clearMessages('error');
      expect(fm.messages.error).toEqual([]);
    });

    it('should use current namespace when no arg', async () => {
      const fm = new FlashMessenger();
      fm.setNamespace('warning');
      await fm.addMessage('msg', 'warning');
      fm.clearMessages();
      expect(fm.messages.warning).toEqual([]);
    });

    it('should clear all messages', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('e', 'error');
      await fm.addMessage('s', 'success');
      fm.clearAllMessages();
      expect(fm.messages.error).toEqual([]);
      expect(fm.messages.success).toEqual([]);
      expect(fm.messageAdded).toBe(false);
    });
  });

  describe('peek', () => {
    it('peekMessages should not clear', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('peek-me');
      fm.peekMessages();
      expect(fm.hasMessages()).toBe(true);
    });

    it('peekAllMessages should not clear', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('err', 'error');
      fm.peekAllMessages();
      expect(fm.hasMessages('error')).toBe(true);
    });
  });

  describe('_promoteNextToCurrent', () => {
    it('should move next messages to current', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('will-promote', 'error');
      fm._promoteNextToCurrent();
      const ns = fm.getSessionNamespace();
      const current = ns.get('error_current', []);
      expect(current).toContain('will-promote');
    });
  });

  describe('addErrorMessage clears success', () => {
    it('should clear success when adding error', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('ok', 'success');
      fm.addErrorMessage('fail');
      expect(fm.messages.success).toEqual([]);
    });
  });

  describe('getMessagesFromContainer', () => {
    it('should be deprecated (undefined return)', () => {
      const fm = new FlashMessenger();
      expect(fm.getMessagesFromContainer()).toBeUndefined();
    });
  });

  describe('_ensureSessionStarted without controller', () => {
    it('should not throw when no controller set', () => {
      const fm = new FlashMessenger();
      expect(() => fm._ensureSessionStarted()).not.toThrow();
    });
  });

  describe('prepareForView', () => {
    it('should not throw without controller', () => {
      const fm = new FlashMessenger();
      expect(() => fm.prepareForView()).not.toThrow();
    });
  });

  describe('_ensureSessionStarted with controller that has session plugin', () => {
    it('should call sessionPlugin.start() when available', () => {
      const fm = new FlashMessenger();
      const startFn = jest.fn();
      const mockController = {
        plugin: jest.fn(() => ({ start: startFn })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => null),
      };
      fm.controller = mockController;
      fm._ensureSessionStarted();
      expect(mockController.plugin).toHaveBeenCalledWith('session');
      expect(startFn).toHaveBeenCalled();
    });

    it('should not throw when controller.plugin returns null', () => {
      const fm = new FlashMessenger();
      const mockController = {
        plugin: jest.fn(() => null),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      fm.controller = mockController;
      expect(() => fm._ensureSessionStarted()).not.toThrow();
    });
  });

  describe('_saveSession', () => {
    it('should call controller session plugin save when available', async () => {
      const fm = new FlashMessenger();
      const saveFn = jest.fn().mockResolvedValue(undefined);
      const mockController = {
        plugin: jest.fn(() => ({ save: saveFn })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      fm.controller = mockController;
      await fm._saveSession();
      expect(saveFn).toHaveBeenCalled();
    });

    it('should fall back to Session.save() when controller plugin has no save', async () => {
      const fm = new FlashMessenger();
      const mockController = {
        plugin: jest.fn(() => ({})),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      fm.controller = mockController;
      const origSave = Session.save;
      Session.save = jest.fn().mockResolvedValue(undefined);
      await fm._saveSession();
      expect(Session.save).toHaveBeenCalled();
      Session.save = origSave;
    });

    it('should catch errors and not throw', async () => {
      const fm = new FlashMessenger();
      const mockController = {
        plugin: jest.fn(() => ({ save: jest.fn().mockRejectedValue(new Error('save err')) })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      fm.controller = mockController;
      await expect(fm._saveSession()).resolves.toBeUndefined();
    });
  });

  describe('_injectTemplateVariables with controller and view', () => {
    it('should set flash message variables on the view', async () => {
      const fm = new FlashMessenger();
      const setVariable = jest.fn();
      const mockView = { setVariable };
      const mockController = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => mockView),
      };
      fm.controller = mockController;

      // Add messages then promote
      await fm.addMessage('success!', 'success');
      await fm.addMessage('info!', 'info');
      fm._promoteNextToCurrent();

      fm._injectTemplateVariables();
      expect(setVariable).toHaveBeenCalledWith('error_flash_messages', []);
      expect(setVariable).toHaveBeenCalledWith('success_flash_messages', ['success!']);
      expect(setVariable).toHaveBeenCalledWith('info_flash_messages', ['info!']);
      expect(setVariable).toHaveBeenCalledWith('warning_flash_messages', []);
    });

    it('should suppress success when errors exist', async () => {
      const fm = new FlashMessenger();
      const setVariable = jest.fn();
      const mockView = { setVariable };
      const mockController = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => mockView),
      };
      fm.controller = mockController;

      await fm.addMessage('ok', 'success');
      await fm.addMessage('fail', 'error');
      fm._promoteNextToCurrent();

      fm._injectTemplateVariables();
      // Success should be suppressed (empty) because there are errors
      const successCall = setVariable.mock.calls.find(c => c[0] === 'success_flash_messages');
      expect(successCall[1]).toEqual([]);
      const errorCall = setVariable.mock.calls.find(c => c[0] === 'error_flash_messages');
      expect(errorCall[1]).toContain('fail');
    });
  });

  describe('hasMessages/getMessages returning false/[] on session error', () => {
    it('hasMessages should return false when session throws', () => {
      const fm = new FlashMessenger();
      // Force getSessionNamespace to throw
      fm.getSessionNamespace = jest.fn(() => { throw new Error('session error'); });
      expect(fm.hasMessages()).toBe(false);
    });

    it('getMessages should return [] when session throws', () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = jest.fn(() => { throw new Error('session error'); });
      expect(fm.getMessages()).toEqual([]);
    });
  });

  describe('clearMessages with empty/null namespace', () => {
    it('should default to current namespace when called with empty string', async () => {
      const fm = new FlashMessenger();
      fm.setNamespace('warning');
      await fm.addMessage('msg', 'warning');
      fm.clearMessages('');
      expect(fm.messages.warning).toEqual([]);
    });

    it('should default to current namespace when called with null', async () => {
      const fm = new FlashMessenger();
      fm.setNamespace('info');
      await fm.addMessage('msg', 'info');
      fm.clearMessages(null);
      expect(fm.messages.info).toEqual([]);
    });
  });

  describe('_promoteNextToCurrent with non-array next values', () => {
    it('should handle non-array next values gracefully', async () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      // Set a non-array value in next
      ns.set('error_next', 'not-an-array');
      expect(() => fm._promoteNextToCurrent()).not.toThrow();
      // Non-array becomes [] so nothing should be promoted
      const current = ns.get('error_current', []);
      expect(current).toEqual([]);
    });
  });

  describe('error handling in _ensureSessionStarted (line 52)', () => {
    it('should catch and debug log errors', () => {
      const fm = new FlashMessenger();
      fm.controller = {
        plugin: jest.fn(() => { throw new Error('no session plugin'); }),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      expect(() => fm._ensureSessionStarted()).not.toThrow();
    });
  });

  describe('addMessage error catch (lines 158-162)', () => {
    it('should cache message locally when session write fails', async () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = () => ({
        get: () => { throw new Error('session broken'); },
        set: () => { throw new Error('session broken'); }
      });

      await fm.addMessage('test msg', 'error');
      expect(fm.messages.error).toContain('test msg');
    });
  });

  describe('getMessages with current messages (lines 222-225)', () => {
    it('should return and optionally clear current messages', () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      ns.set('error_current', ['msg1', 'msg2']);

      const msgs = fm.getMessages('error', true);
      expect(msgs).toEqual(['msg1', 'msg2']);
      expect(ns.get('error_current', [])).toEqual([]);
    });
  });

  describe('_clearNamespacePair error catch (line 262)', () => {
    it('should warn on error', () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = () => { throw new Error('broken'); };
      expect(() => fm._clearNamespacePair('error')).not.toThrow();
    });
  });

  describe('clearAllMessages error catch (line 289)', () => {
    it('should warn on error', () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = () => { throw new Error('broken'); };
      expect(() => fm.clearAllMessages()).not.toThrow();
    });
  });

  describe('_promoteNextToCurrent error catch (line 326)', () => {
    it('should warn on error', () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = () => { throw new Error('broken'); };
      expect(() => fm._promoteNextToCurrent()).not.toThrow();
    });
  });

  describe('_injectTemplateVariables error catch (line 367)', () => {
    it('should debug log on error', () => {
      const fm = new FlashMessenger();
      fm.controller = {
        getView: () => { throw new Error('no view'); },
        plugin: jest.fn(),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      expect(() => fm._injectTemplateVariables()).not.toThrow();
    });
  });

  describe('branch coverage: non-array session values', () => {
    it('should handle non-array messages in addMessage (line 145)', async () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      // Set non-array value for next key
      ns.set('default_next', 'not-an-array');
      await fm.addMessage('test');
      expect(fm.messages.default).toContain('test');
    });

    it('should handle non-array current in hasMessages (line 199)', () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      ns.set('default_current', 'not-an-array');
      // Should still check next and local
      expect(fm.hasMessages()).toBe(false);
    });

    it('should handle non-array current in getMessages (line 220)', () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      ns.set('default_current', 'not-an-array');
      ns.set('default_next', ['fallback']);
      const msgs = fm.getMessages();
      expect(msgs).toEqual(['fallback']);
    });

    it('should handle non-array next in getMessages (line 230)', () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      ns.set('default_current', []);
      ns.set('default_next', 'not-an-array');
      const msgs = fm.getMessages();
      expect(msgs).toEqual([]);
    });

    it('should not clear when clearAfterRead false and current has messages (line 224)', () => {
      const fm = new FlashMessenger();
      const ns = fm.getSessionNamespace();
      ns.set('error_current', ['msg1']);
      const msgs = fm.getMessages('error', false);
      expect(msgs).toEqual(['msg1']);
      // Should NOT have cleared
      expect(ns.get('error_current', [])).toEqual(['msg1']);
    });

    it('should clear next messages when clearAfterRead and no current (line 233)', async () => {
      const fm = new FlashMessenger();
      await fm.addMessage('next-msg', 'info');
      const msgs = fm.getMessages('info', true);
      expect(msgs).toContain('next-msg');
      // After clearing, next should be empty
      const again = fm.getMessages('info', true);
      expect(again).toEqual([]);
    });
  });

  describe('branch coverage: _clearNamespacePair with non-existent namespace (line 260)', () => {
    it('should handle namespace not in messages map', () => {
      const fm = new FlashMessenger();
      expect(() => fm._clearNamespacePair('nonexistent')).not.toThrow();
    });
  });

  describe('branch coverage: _saveSession without controller plugin (line 85)', () => {
    it('should fall back to Session.save when no controller', async () => {
      const fm = new FlashMessenger();
      // no controller set, so it should try Session.save
      const origSave = Session.save;
      Session.save = jest.fn().mockResolvedValue(undefined);
      await fm._saveSession();
      expect(Session.save).toHaveBeenCalled();
      Session.save = origSave;
    });

    it('should handle controller without plugin function (line 77)', async () => {
      const fm = new FlashMessenger();
      fm.controller = {
        plugin: 'not-a-function',
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
      };
      const origSave = Session.save;
      Session.save = jest.fn().mockResolvedValue(undefined);
      await fm._saveSession();
      expect(Session.save).toHaveBeenCalled();
      Session.save = origSave;
    });
  });

  describe('branch coverage: _injectTemplateVariables with non-array session values (line 345-348)', () => {
    it('should handle non-array session current values', async () => {
      const fm = new FlashMessenger();
      const setVariable = jest.fn();
      const mockView = { setVariable };
      fm.controller = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => mockView),
      };

      const ns = fm.getSessionNamespace();
      ns.set('error_current', 'not-array');
      ns.set('success_current', 'not-array');
      ns.set('warning_current', 'not-array');
      ns.set('info_current', 'not-array');

      fm._injectTemplateVariables();
      expect(setVariable).toHaveBeenCalledWith('error_flash_messages', []);
      expect(setVariable).toHaveBeenCalledWith('success_flash_messages', []);
    });

    it('should handle view without setVariable (line 336)', () => {
      const fm = new FlashMessenger();
      fm.controller = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => ({})),
      };
      expect(() => fm._injectTemplateVariables()).not.toThrow();
    });

    it('should handle controller.getView returning null (line 336)', () => {
      const fm = new FlashMessenger();
      fm.controller = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => null),
      };
      expect(() => fm._injectTemplateVariables()).not.toThrow();
    });
  });

  describe('branch coverage: addMessage catch with custom namespace (line 161)', () => {
    it('should create namespace in catch block if not exists', async () => {
      const fm = new FlashMessenger();
      fm.getSessionNamespace = () => ({
        get: () => { throw new Error('broken'); },
        set: () => { throw new Error('broken'); }
      });
      await fm.addMessage('test', 'custom_ns');
      expect(fm.messages.custom_ns).toContain('test');
    });
  });

  describe('prepareForView full flow with controller', () => {
    it('should promote and inject variables', async () => {
      const fm = new FlashMessenger();
      const setVariable = jest.fn();
      const mockView = { setVariable };
      const mockController = {
        plugin: jest.fn(() => ({ start: jest.fn() })),
        getRequest: jest.fn(),
        getResponse: jest.fn(),
        getServiceManager: jest.fn(),
        getView: jest.fn(() => mockView),
      };
      fm.controller = mockController;

      await fm.addMessage('err', 'error');
      fm.prepareForView();

      expect(setVariable).toHaveBeenCalledWith('error_flash_messages', expect.arrayContaining(['err']));
    });
  });
});
