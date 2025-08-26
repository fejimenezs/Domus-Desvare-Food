import { db, session } from "./db.js";

export function registerUser(email, password, role){
  const users = db.users;
  if(users.find(u=>u.email===email)){
    throw new Error("El usuario ya existe");
  }
  const user = { email, password, role };
  users.push(user);
  db.users = users;
  return true;
}

export function loginUser(email, password){
  const user = db.users.find(u=>u.email===email && u.password===password);
  if(!user) throw new Error("Credenciales inválidas");
  session.active = user;
  return user;
}

export function logoutUser(){
  session.clear();
}

export function getActiveUser(){
  return session.active;
}
