import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Failsafe for clsx/cn
const r = (e) => {
  var t, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
      var o = e.length;
      for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f)
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n
}
window.clsx = window.cn = (...args) => {
  for (var e, t, f = 0, n = "", o = args.length; f < o; f++) (e = args[f]) && (t = r(e)) && (n && (n += " "), n += t);
  return n
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
