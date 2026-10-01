document.addEventListener("click", async (event) => {
  const copy = event.target.closest(".copy");
  if (copy) {
    const el = document.getElementById(copy.dataset.target);
    await navigator.clipboard.writeText(el.value);
    const label = copy.textContent;
    copy.textContent = "Copied!";
    setTimeout(() => (copy.textContent = label), 1500);
  }
  if (event.target.id === "refresh-btn") {
    event.target.disabled = true;
    event.target.textContent = "Refreshing...";
    await fetch("/refresh", { method: "POST" });
    pollRefresh();
  }
});

async function pollRefresh() {
  const status = document.getElementById("refresh-status");
  const res = await fetch("/refresh/status");
  const state = await res.json();
  if (state.running) {
    const done = Object.keys(state.counts).length;
    if (status) status.textContent = `Checking job boards... ${done} sources done`;
    setTimeout(pollRefresh, 1500);
  } else {
    location.reload();
  }
}

const refreshBox = document.querySelector(".refresh");
if (refreshBox && refreshBox.dataset.running === "1") pollRefresh();
