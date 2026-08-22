document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-material-form]");
  if (!form) return;

  const typeField = document.getElementById("id_material_type");
  const fileRow = form.querySelector('[data-field-name="file"]');
  const contentRow = form.querySelector('[data-field-name="content"]');

  const updatePayloadFields = () => {
    if (!typeField || !fileRow || !contentRow) return;
    const isWriteUp = typeField.value === "write_up";
    fileRow.classList.toggle("hidden", isWriteUp);
    contentRow.classList.toggle("hidden", !isWriteUp);
  };

  if (typeField) {
    typeField.addEventListener("change", updatePayloadFields);
    updatePayloadFields();
  }

  const progressPanel = form.querySelector("[data-upload-progress]");
  const progressBar = form.querySelector("[data-upload-progress-bar]");
  const progressLabel = form.querySelector("[data-upload-progress-label]");
  const submitButton = form.querySelector('[type="submit"]');
  const submitLabel = form.querySelector("[data-submit-label]");

  if (!progressPanel || !progressBar || !progressLabel || !submitButton) return;

  const setProgress = (percent, label) => {
    const boundedPercent = Math.max(0, Math.min(100, percent));
    progressBar.style.width = `${boundedPercent}%`;
    progressBar.setAttribute("aria-valuenow", String(Math.round(boundedPercent)));
    progressLabel.textContent = label;
  };

  const resetFormState = (message) => {
    submitButton.disabled = false;
    submitButton.classList.remove("cursor-not-allowed", "opacity-70");
    if (submitLabel) submitLabel.textContent = submitButton.dataset.defaultLabel;
    setProgress(0, message);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const request = new XMLHttpRequest();
    request.open(form.method || "POST", form.action || window.location.href);
    request.setRequestHeader("X-Requested-With", "XMLHttpRequest");

    progressPanel.classList.remove("hidden");
    submitButton.disabled = true;
    submitButton.classList.add("cursor-not-allowed", "opacity-70");
    if (submitLabel) submitLabel.textContent = "Uploading...";
    setProgress(0, "Preparing upload...");

    request.upload.addEventListener("progress", (progressEvent) => {
      if (!progressEvent.lengthComputable) {
        progressLabel.textContent = "Uploading material...";
        return;
      }
      const percent = (progressEvent.loaded / progressEvent.total) * 100;
      setProgress(percent, `Uploading... ${Math.round(percent)}%`);
    });

    request.upload.addEventListener("load", () => {
      setProgress(100, "Upload complete. Saving material...");
    });

    request.addEventListener("load", () => {
      const contentType = request.getResponseHeader("Content-Type") || "";
      if (request.status >= 200 && request.status < 300 && contentType.includes("application/json")) {
        const payload = JSON.parse(request.responseText);
        window.location.assign(payload.redirect_url);
        return;
      }

      if (request.status >= 200 && request.status < 300) {
        document.open();
        document.write(request.responseText);
        document.close();
        return;
      }

      resetFormState("Upload failed. Please try again.");
    });

    request.addEventListener("error", () => {
      resetFormState("Network error. Check your connection and try again.");
    });

    request.addEventListener("abort", () => {
      resetFormState("Upload cancelled.");
    });

    request.send(new FormData(form));
  });
});
