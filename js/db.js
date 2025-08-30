// db.js - simulated DB with localStorage
const LS_KEYS = {
  users: "bb_users",
  offers: "bb_offers",
  activeUser: "bb_active_user"
};

function read(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{ return fallback; }
}
function write(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  get users(){ return read(LS_KEYS.users, []); },
  set users(v){ write(LS_KEYS.users, v); },
  get offers(){ return read(LS_KEYS.offers, []); },
  set offers(v){ write(LS_KEYS.offers, v); }
};

export const session = {
  get active(){ return read(LS_KEYS.activeUser, null); },
  set active(u){ write(LS_KEYS.activeUser, u); },
  clear(){ localStorage.removeItem(LS_KEYS.activeUser); }
};

// Seed with a few offers only on first run
(function seed(){
  const hasOffers = localStorage.getItem(LS_KEYS.offers);
  if(!hasOffers){
    const sample = [
      { id: 1, seller: "chef@bidbite.com", desc: "Paella de mariscos", price: 18.5, qty: 5, loc: "Bogotá", bids: [] },
      { id: 2, seller: "veggie@bidbite.com", desc: "Ensalada orgánica XXL", price: 9.9, qty: 12, loc: "Medellín", bids: [] },
      { id: 3, seller: "baker@bidbite.com", desc: "Pack 12 croissants", price: 14.0, qty: 3, loc: "Cali", bids: [] }
    ];
    write(LS_KEYS.offers, sample);
    const sampleUsers = [{email:"chef@bidbite.com", password:"123456", role:"seller"}];
    write(LS_KEYS.users, sampleUsers);
  }
})();
