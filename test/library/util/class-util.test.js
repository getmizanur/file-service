const path = require('path');
const projectRoot = path.resolve(__dirname, '../../../');
const ClassUtil = require(path.join(projectRoot, 'library/util/class-util'));

class Animal { speak() { return 'sound'; } }
class Dog extends Animal { bark() { return 'woof'; } static breed = 'mixed'; static info() { return 'dog'; } }
class Puppy extends Dog { play() { return 'play'; } }

describe('ClassUtil', () => {
  describe('getParentClass', () => {
    it('should return parent class from class', () => {
      expect(ClassUtil.getParentClass(Dog)).toBe(Animal);
    });

    it('should return parent class from instance', () => {
      expect(ClassUtil.getParentClass(new Dog())).toBe(Animal);
    });

    it('should return null for base class', () => {
      expect(ClassUtil.getParentClass(Animal)).toBeNull();
    });

    it('should return null for non-function target', () => {
      expect(ClassUtil.getParentClass({ constructor: 'notAFunction' })).toBeNull();
    });
  });

  describe('getClassName', () => {
    it('should get class name from class', () => {
      expect(ClassUtil.getClassName(Dog)).toBe('Dog');
    });

    it('should get class name from instance', () => {
      expect(ClassUtil.getClassName(new Dog())).toBe('Dog');
    });

    it('should return Anonymous for unnamed function', () => {
      expect(ClassUtil.getClassName(Object.defineProperty(function(){}, 'name', { value: '' }))).toBe('Anonymous');
    });

    it('should return Object for plain object without constructor', () => {
      expect(ClassUtil.getClassName(Object.create(null))).toBe('Object');
    });

    it('should return Unknown for non-object', () => {
      expect(ClassUtil.getClassName(42)).toBe('Unknown');
    });
  });

  describe('isSubclassOf', () => {
    it('should detect subclass by class reference', () => {
      expect(ClassUtil.isSubclassOf(Dog, Animal)).toBe(true);
    });

    it('should detect subclass by string', () => {
      expect(ClassUtil.isSubclassOf(Dog, 'Animal')).toBe(true);
    });

    it('should detect deep inheritance', () => {
      expect(ClassUtil.isSubclassOf(Puppy, Animal)).toBe(true);
    });

    it('should detect from instance', () => {
      expect(ClassUtil.isSubclassOf(new Dog(), Animal)).toBe(true);
    });

    it('should return false for non-subclass', () => {
      expect(ClassUtil.isSubclassOf(Animal, Dog)).toBe(false);
    });

    it('should return false for non-function target', () => {
      expect(ClassUtil.isSubclassOf({ constructor: 'x' }, Animal)).toBe(false);
    });
  });

  describe('isInstanceOf', () => {
    it('should check by class', () => {
      expect(ClassUtil.isInstanceOf(new Dog(), Animal)).toBe(true);
      expect(ClassUtil.isInstanceOf(new Dog(), Dog)).toBe(true);
    });

    it('should check by string', () => {
      expect(ClassUtil.isInstanceOf(new Dog(), 'Dog')).toBe(true);
    });

    it('should return false for non-object', () => {
      expect(ClassUtil.isInstanceOf(null, Dog)).toBe(false);
      expect(ClassUtil.isInstanceOf(42, Dog)).toBe(false);
    });

    it('should return false for non-function/non-string', () => {
      expect(ClassUtil.isInstanceOf(new Dog(), 42)).toBe(false);
    });
  });

  describe('getClassMethods', () => {
    it('should get all methods including inherited', () => {
      const methods = ClassUtil.getClassMethods(Dog);
      expect(methods).toContain('bark');
      expect(methods).toContain('speak');
    });

    it('should work with instances', () => {
      const methods = ClassUtil.getClassMethods(new Dog());
      expect(methods).toContain('bark');
    });
  });

  describe('getOwnMethods', () => {
    it('should get only own methods', () => {
      const methods = ClassUtil.getOwnMethods(Dog);
      expect(methods).toContain('bark');
      expect(methods).not.toContain('speak');
    });

    it('should work with instances', () => {
      const obj = { myMethod() {} };
      const methods = ClassUtil.getOwnMethods(obj);
      expect(methods).toContain('myMethod');
    });

    it('should handle objects with Symbol properties', () => {
      const sym = Symbol('mySymbol');
      const obj = { [sym]() {}, normalMethod() {} };
      const methods = ClassUtil.getOwnMethods(obj);
      expect(methods).toContain('normalMethod');
    });
  });

  describe('getClassMethods with Symbol properties', () => {
    it('should handle classes with Symbol methods in prototype chain', () => {
      const sym = Symbol('classSym');
      class Base {
        [sym]() { return 'base'; }
      }
      class Child extends Base {
        childMethod() {}
      }
      const methods = ClassUtil.getClassMethods(Child);
      expect(methods).toContain('childMethod');
    });
  });

  describe('methodExists', () => {
    it('should return true for existing method', () => {
      expect(ClassUtil.methodExists(Dog, 'bark')).toBe(true);
    });

    it('should return true for inherited method', () => {
      expect(ClassUtil.methodExists(Dog, 'speak')).toBe(true);
    });

    it('should return false for non-existent method', () => {
      expect(ClassUtil.methodExists(Dog, 'fly')).toBe(false);
    });
  });

  describe('isCallable', () => {
    it('should return true for callable method', () => {
      expect(ClassUtil.isCallable(new Dog(), 'bark')).toBe(true);
    });

    it('should return false for null', () => {
      expect(ClassUtil.isCallable(null, 'bark')).toBeFalsy();
    });
  });

  describe('callMethod / callMethodArray', () => {
    it('should call method with args', () => {
      expect(ClassUtil.callMethod(new Dog(), 'bark')).toBe('woof');
    });

    it('should throw for non-callable', () => {
      expect(() => ClassUtil.callMethod(new Dog(), 'fly')).toThrow("not callable");
    });

    it('should call with args array', () => {
      const obj = { add(a, b) { return a + b; } };
      expect(ClassUtil.callMethodArray(obj, 'add', [1, 2])).toBe(3);
    });
  });

  describe('getObjectProperties', () => {
    it('should get own properties', () => {
      const obj = new Dog();
      obj.name = 'Rex';
      const props = ClassUtil.getObjectProperties(obj, true);
      expect(props).toContain('name');
    });

    it('should get all properties (including inherited)', () => {
      const obj = new Dog();
      obj.name = 'Rex';
      const props = ClassUtil.getObjectProperties(obj);
      expect(props).toContain('name');
    });

    it('should return empty for non-object', () => {
      expect(ClassUtil.getObjectProperties(null)).toEqual([]);
    });
  });

  describe('getStaticProperties', () => {
    it('should get static properties', () => {
      expect(ClassUtil.getStaticProperties(Dog)).toContain('breed');
    });

    it('should return empty for non-function', () => {
      expect(ClassUtil.getStaticProperties('string')).toEqual([]);
    });
  });

  describe('getStaticMethods', () => {
    it('should get static methods', () => {
      expect(ClassUtil.getStaticMethods(Dog)).toContain('info');
    });

    it('should return empty for non-function', () => {
      expect(ClassUtil.getStaticMethods(42)).toEqual([]);
    });
  });

  describe('propertyExists', () => {
    it('should return true for existing property', () => {
      expect(ClassUtil.propertyExists({ a: 1 }, 'a')).toBe(true);
    });

    it('should return false for non-object', () => {
      expect(ClassUtil.propertyExists(null, 'a')).toBe(false);
    });
  });

  describe('getProperty / setProperty', () => {
    it('should get property value', () => {
      expect(ClassUtil.getProperty({ a: 1 }, 'a')).toBe(1);
    });

    it('should return default for missing property', () => {
      expect(ClassUtil.getProperty({}, 'missing', 'def')).toBe('def');
    });

    it('should return default for non-object', () => {
      expect(ClassUtil.getProperty(null, 'a', 'def')).toBe('def');
    });

    it('should set property value', () => {
      const obj = {};
      expect(ClassUtil.setProperty(obj, 'key', 'val')).toBe(true);
      expect(obj.key).toBe('val');
    });

    it('should return false for non-object', () => {
      expect(ClassUtil.setProperty(null, 'key', 'val')).toBe(false);
    });
  });

  describe('getClassInfo', () => {
    it('should return comprehensive info for a class', () => {
      const info = ClassUtil.getClassInfo(Dog);
      expect(info.name).toBe('Dog');
      expect(info.isInstance).toBe(false);
      expect(info.parentClass).toBe(Animal);
      expect(info.methods).toContain('bark');
    });

    it('should return info for an instance', () => {
      const dog = new Dog();
      dog.name = 'Rex';
      const info = ClassUtil.getClassInfo(dog);
      expect(info.isInstance).toBe(true);
      expect(info.properties).toContain('name');
    });
  });

  describe('hasTrait', () => {
    it('should detect trait method', () => {
      expect(ClassUtil.hasTrait(Dog, 'bark')).toBe(true);
    });

    it('should return false for missing trait', () => {
      expect(ClassUtil.hasTrait(Dog, 'fly')).toBe(false);
    });
  });

  describe('createInstance', () => {
    it('should create instance', () => {
      const dog = ClassUtil.createInstance(Dog);
      expect(dog).toBeInstanceOf(Dog);
    });

    it('should throw for non-function', () => {
      expect(() => ClassUtil.createInstance('notAClass')).toThrow('must be a class');
    });
  });

  describe('cloneObject', () => {
    it('should shallow clone object', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = ClassUtil.cloneObject(obj);
      expect(cloned.a).toBe(1);
      expect(cloned.b).toBe(obj.b); // shallow
    });

    it('should clone array', () => {
      const arr = [1, 2, 3];
      const cloned = ClassUtil.cloneObject(arr);
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
    });

    it('should return primitives as-is', () => {
      expect(ClassUtil.cloneObject(42)).toBe(42);
      expect(ClassUtil.cloneObject(null)).toBeNull();
    });

    it('should preserve prototype', () => {
      const dog = new Dog();
      const cloned = ClassUtil.cloneObject(dog);
      expect(cloned).toBeInstanceOf(Dog);
    });
  });

  describe('deepClone', () => {
    it('should deep clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const cloned = ClassUtil.deepClone(obj);
      expect(cloned.a.b.c).toBe(1);
      cloned.a.b.c = 99;
      expect(obj.a.b.c).toBe(1);
    });

    it('should clone Date', () => {
      const date = new Date('2024-01-01');
      const cloned = ClassUtil.deepClone(date);
      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it('should clone RegExp', () => {
      const regex = /test/gi;
      const cloned = ClassUtil.deepClone(regex);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
    });

    it('should clone arrays deeply', () => {
      const arr = [[1, 2], [3, 4]];
      const cloned = ClassUtil.deepClone(arr);
      expect(cloned).toEqual(arr);
      cloned[0][0] = 99;
      expect(arr[0][0]).toBe(1);
    });

    it('should return primitives as-is', () => {
      expect(ClassUtil.deepClone(null)).toBeNull();
      expect(ClassUtil.deepClone(42)).toBe(42);
      expect(ClassUtil.deepClone('str')).toBe('str');
    });
  });

  describe('isClass', () => {
    it('should return true for class', () => {
      expect(ClassUtil.isClass(Dog)).toBe(true);
    });

    it('should return false for non-class', () => {
      expect(ClassUtil.isClass('string')).toBe(false);
    });
  });

  describe('getConstructor', () => {
    it('should get constructor', () => {
      expect(ClassUtil.getConstructor(new Dog())).toBe(Dog);
    });

    it('should return null for non-object', () => {
      expect(ClassUtil.getConstructor(42)).toBeNull();
    });
  });

  describe('isSameClass', () => {
    it('should return true for same class', () => {
      expect(ClassUtil.isSameClass(new Dog(), new Dog())).toBe(true);
    });

    it('should return false for different classes', () => {
      expect(ClassUtil.isSameClass(new Dog(), new Animal())).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(ClassUtil.isSameClass(null, new Dog())).toBe(false);
    });
  });

  describe('implementsInterface', () => {
    it('should return true when all methods exist', () => {
      expect(ClassUtil.implementsInterface(Dog, { bark: true, speak: true })).toBe(true);
    });

    it('should return false when method missing', () => {
      expect(ClassUtil.implementsInterface(Dog, { fly: true })).toBe(false);
    });
  });

  describe('mixin', () => {
    it('should mix methods into class', () => {
      class Target {}
      ClassUtil.mixin(Target, { greet() { return 'hi'; } });
      expect(new Target().greet()).toBe('hi');
    });

    it('should skip non-object mixins', () => {
      class Target {}
      expect(() => ClassUtil.mixin(Target, null, 'string')).not.toThrow();
    });

    it('should skip non-function properties', () => {
      class Target {}
      ClassUtil.mixin(Target, { value: 42 });
      expect(Target.prototype.value).toBeUndefined();
    });

    it('should throw for non-function target', () => {
      expect(() => ClassUtil.mixin('notAClass', {})).toThrow('must be a class');
    });
  });

  describe('serialize / unserialize', () => {
    it('should serialize object to JSON', () => {
      expect(ClassUtil.serialize({ a: 1 })).toBe('{"a":1}');
    });

    it('should unserialize JSON to object', () => {
      expect(ClassUtil.unserialize('{"a":1}')).toEqual({ a: 1 });
    });

    it('should throw for circular references', () => {
      const obj = {};
      obj.self = obj;
      expect(() => ClassUtil.serialize(obj)).toThrow('Failed to serialize');
    });

    it('should throw for invalid JSON', () => {
      expect(() => ClassUtil.unserialize('not json')).toThrow('Failed to unserialize');
    });
  });
});
