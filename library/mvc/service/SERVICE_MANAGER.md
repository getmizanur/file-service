# Service Manager - Centralized Service Access

All framework services (ViewManager, ViewHelperManager, PluginManager) are now managed through the ServiceManager, following the Service Locator pattern.

## Architecture Changes

### Before:
Controllers instantiated services directly with manual configuration:
```javascript
// OLD - Direct instantiation
getPluginManager() {
    if(!this.pluginManager) {
        const pluginManager = new PluginManager();
        pluginManager.setConfig(appConfig);
        this.pluginManager = pluginManager;
    }
    return this.pluginManager;
}
```

### After:
Services are retrieved from ServiceManager:
```javascript
// NEW - Service Locator pattern
getPluginManager() {
    if(!this.pluginManager) {
        const pluginManager = this.getServiceManager().get('PluginManager');
        this.setPluginManager(pluginManager);
    }
    return this.pluginManager;
}
```

## Available Framework Services

The following services are registered in ServiceManager via factories:

### 1. ViewManager
**Factory:** `/library/service/factory/view-manager-factory.js`
**Usage:**
```javascript
// In controller
const viewManager = this.getServiceManager().get('ViewManager');
// Or use the convenience method
const viewManager = this.getViewManager();
```

### 2. ViewHelperManager
**Factory:** `/library/service/factory/view-helper-manager-factory.js`
**Usage:**
```javascript
// In controller
const helperManager = this.getServiceManager().get('ViewHelperManager');
// Or use the convenience method
const helperManager = this.getViewHelperManager();
```

### 3. PluginManager
**Factory:** `/library/service/factory/plugin-manager-factory.js`
**Usage:**
```javascript
// In controller
const pluginManager = this.getServiceManager().get('PluginManager');
// Or use the convenience method
const pluginManager = this.getPluginManager();
```

## Controller Helper Methods

BaseController provides convenience methods for common services:

```javascript
class MyController extends BaseController {
    myAction() {
        // Get ViewManager
        const viewManager = this.getViewManager();

        // Get ViewHelperManager
        const helperManager = this.getViewHelperManager();

        // Get PluginManager
        const pluginManager = this.getPluginManager();

        // Get a specific plugin (shortcut)
        const flashMessenger = this.plugin('flashMessenger');

        // Get View (shortcut)
        const view = this.getView();
    }
}
```

## Benefits of ServiceManager Pattern

### 1. **Centralized Configuration**
All service configuration is in one place: `application.config.js`

```javascript
"service_manager": {
    "invokables": {
        "EmailService": "/application/service/verifyEmailService",
        "PostService": "/application/service/postService"
    },
    "factories": {
        "ViewManager": "/library/service/factory/view-manager-factory",
        "ViewHelperManager": "/library/service/factory/view-helper-manager-factory",
        "PluginManager": "/library/service/factory/plugin-manager-factory"
    }
}
```

### 2. **Lazy Loading**
Services are only created when first requested, not on every controller instantiation.

### 3. **Singleton Pattern**
Each service is instantiated once and cached by ServiceManager:
```javascript
// First call creates the instance
const vm1 = this.getServiceManager().get('ViewManager');

// Subsequent calls return the cached instance
const vm2 = this.getServiceManager().get('ViewManager');

// vm1 === vm2 (same instance)
```

### 4. **Testability**
Easy to mock services in tests by replacing ServiceManager:
```javascript
// In tests
const mockViewManager = { /* mock implementation */ };
serviceManager.services['ViewManager'] = mockViewManager;
```

### 5. **Dependency Injection**
Factories handle complex initialization and dependency injection automatically.

## Factory Pattern

Each service uses a factory that extends `AbstractFactory`:

```javascript
// library/service/factory/view-manager-factory.js
const AbstractFactory = require('../abstract-factory');
const ViewManager = require('../../view/view-manager');

class ViewManagerFactory extends AbstractFactory {
    createService(serviceManager) {
        // Get configuration
        const controller = serviceManager.getController();
        const container = controller.getConfig();
        const appConfig = container.get('application');
        const viewManagerConfig = appConfig.view_manager || {};

        // Create and configure service
        return new ViewManager(viewManagerConfig);
    }
}

module.exports = ViewManagerFactory;
```

## Adding Custom Services

To add your own service:

### 1. Create the Service Class
```javascript
// application/service/myCustomService.js
class MyCustomService {
    doSomething() {
        // Service logic
    }
}

module.exports = MyCustomService;
```

### 2. Option A: Simple Invokable (no configuration needed)
```javascript
// application.config.js
"service_manager": {
    "invokables": {
        "MyCustomService": "/application/service/myCustomService"
    }
}
```

### 3. Option B: Factory (complex initialization)
```javascript
// library/service/factory/myCustomServiceFactory.js
const AbstractFactory = require('../abstractFactory');
const MyCustomService = require('../../application/service/myCustomService');

class MyCustomServiceFactory extends AbstractFactory {
    createService(serviceManager) {
        const controller = serviceManager.getController();
        const config = controller.getConfig().get('application');

        return new MyCustomService(config.myCustomConfig);
    }
}

module.exports = MyCustomServiceFactory;
```

Then register in config:
```javascript
// application.config.js
"service_manager": {
    "factories": {
        "MyCustomService": "/library/service/factory/myCustomServiceFactory"
    }
}
```

### 4. Use in Controller
```javascript
class MyController extends BaseController {
    myAction() {
        const myService = this.getServiceManager().get('MyCustomService');
        myService.doSomething();
    }
}
```

## Migration Notes

### Before (Old Pattern):
```javascript
// Controllers created services directly
const viewManager = new ViewManager(config);
const pluginManager = new PluginManager();
```

### After (New Pattern):
```javascript
// Controllers use ServiceManager
const viewManager = this.getServiceManager().get('ViewManager');
const pluginManager = this.getServiceManager().get('PluginManager');

// Or use convenience methods
const viewManager = this.getViewManager();
const pluginManager = this.getPluginManager();
```

## Best Practices

1. **Always use ServiceManager** for framework services (ViewManager, PluginManager, etc.)
2. **Use factories** for services that need configuration or dependencies
3. **Use invokables** for simple services with no-arg constructors
4. **Cache instances** - ServiceManager automatically caches, don't create duplicates
5. **Use convenience methods** when available (`getViewManager()` vs `getServiceManager().get('ViewManager')`)

## Debugging

Check available services:
```javascript
const services = this.getServiceManager().getAvailableServices();
console.log('Available services:', services);
// Output: ['EmailService', 'PostService', 'ViewManager', 'ViewHelperManager', 'PluginManager']
```

Check if service exists:
```javascript
if (this.getServiceManager().has('MyService')) {
    const service = this.getServiceManager().get('MyService');
}
```

Clear cached service (force recreation):
```javascript
this.getServiceManager().clearService('ViewManager');
const freshViewManager = this.getServiceManager().get('ViewManager');
```
