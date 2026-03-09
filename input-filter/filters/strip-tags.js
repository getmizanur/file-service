// library/input-filter/filters/strip-tags.js
class StripTags {

  filter(value) {
    return value.replaceAll(/<\/?[^>]+(>|$)/, "");
  }

}

module.exports = StripTags
