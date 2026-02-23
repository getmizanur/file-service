// application/dto/user-search-dto.js
class UserSearchDTO {
  setUserId(v) { this.user_id = v; }
  setEmail(v) { this.email = v; }
  setDisplayName(v) { this.display_name = v; }
}

module.exports = UserSearchDTO;
