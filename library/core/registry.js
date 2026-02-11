class Registry {

  constructor() {
    this.registry = {};
  }

  get(index) {
    if(!this.registry.hasOwnProperty(index)) {
      throw Error(`No entry is registered for key ${index}`);
    }

    return this.registry[index];
  }

  set(index, value) {
    this.registry[index] = value;

    return this;
  }

  isRegistered(index) {
    if(this.registry == null) {
      return false;
    }

    return this.registry.hasOwnProperty(index);
  }

}

module.exports = Registry;
