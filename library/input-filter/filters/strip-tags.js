class StripTags {

  filter(value) {
    return value.replace(/<\/?[^>]+(>|$)/g, "");
  }

}

module.exports = StripTags
