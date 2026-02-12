import { Outlet, Link } from "react-router-dom";

function MainLayout() {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ width: "200px", padding: "20px", background: "#eee" }}>
        <h3>Navigation</h3>
        <Link to="/">Home</Link>
        <br />
        <Link to="/map">Map</Link>
      </div>

      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;
