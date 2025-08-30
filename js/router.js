import { getActiveUser } from "./auth.js";

const routes = {
  "/home": "/pages/home.html",
  "/login": "/pages/login.html",
  "/register": "/pages/register.html",
  "/offers": "/pages/offers.html",
  "/create-offer": "/pages/create-offer.html",
  "/bid": "/pages/bid.html",
};

const protectedRoutes = ["/offers", "/create-offer", "/bid"];

export async function router(){
  const path = (location.hash.replace("#","") || "/home").split("?")[0];
  const app = document.getElementById("app");

  // Guard
  if (protectedRoutes.includes(path) && !getActiveUser()){
    location.hash = "/login";
    return;
  }

  const url = routes[path] || routes["/home"];
  const html = await fetch(url).then(r=>r.text());
  app.innerHTML = html;

  // Dispatch event so page controllers can init
  document.dispatchEvent(new CustomEvent("route:loaded", { detail:{ path } }));
  window.scrollTo(0,0);
}
