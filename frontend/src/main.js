import "./style.css";

const services = [
  { name: "Backend", url: "/backend-api/health" },
  { name: "AI engine", url: "/ai-api/health" },
];

const list = document.querySelector("#services");

async function refreshStatuses() {
  list.replaceChildren();

  await Promise.all(
    services.map(async (service) => {
      const item = document.createElement("li");
      item.textContent = `${service.name}: checking...`;
      list.append(item);

      try {
        const response = await fetch(service.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        const details = result.inference_available === false
          ? " (inference not implemented)"
          : "";
        item.textContent = `${service.name}: ${result.status}${details}`;
      } catch (error) {
        item.textContent = `${service.name}: unavailable (${error.message})`;
      }
    }),
  );
}

document.querySelector("#refresh").addEventListener("click", refreshStatuses);
refreshStatuses();
