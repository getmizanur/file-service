// library/input-filter/filters/strip-tags.js
class StripTags {

  filter(value) {
    return value.replace(/<\/?[^>]+(>|$)/g, "");
  }

}

module.exports = StripTags
