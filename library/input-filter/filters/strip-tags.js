// library/input-filter/filters/strip-tags.js
class StripTags {

  filter(value) {
    return value.replaceAll(/<\/?[^>]+(>|$)/g, "");
  }

}

module.exports = StripTags
