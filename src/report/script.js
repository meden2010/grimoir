(function () {
        const tabNav = document.getElementById("tabNav");
        let isTransitioning = false;

        function showPanel(panel) {
          panel.classList.remove("hidden", "hidden-panel");
          panel.classList.add("entering-panel");
          void panel.offsetWidth;
          requestAnimationFrame(() => {
            panel.classList.remove("entering-panel");
            panel.classList.add("active-panel");
          });

          // Initialize charts lazily when their tab becomes visible
          if (panel.id === "tab-automated") renderAutomatedTree();
          if (panel.id === "tab-perf") initPerfChart();
        }

        tabNav.addEventListener("click", (e) => {
          const btn = e.target.closest("button[data-tab]");
          if (!btn || isTransitioning) return;

          const tab = btn.dataset.tab;
          const targetPanel = document.getElementById("tab-" + tab);
          const currentPanel = document.querySelector(
            ".tab-panel.active-panel",
          );

          if (!targetPanel || targetPanel === currentPanel) return;

          isTransitioning = true;
          document
            .querySelectorAll("#tabNav button")
            .forEach((b) => b.classList.remove("tab-active"));
          btn.classList.add("tab-active");

          if (currentPanel) {
            const onTransitionEnd = (event) => {
              if (event.propertyName !== "opacity") return;
              currentPanel.removeEventListener(
                "transitionend",
                onTransitionEnd,
              );
              currentPanel.classList.add("hidden");
              currentPanel.classList.remove("hidden-panel");
              showPanel(targetPanel);
              setTimeout(() => {
                isTransitioning = false;
              }, 300);
            };
            currentPanel.addEventListener("transitionend", onTransitionEnd);
            currentPanel.classList.remove("active-panel");
            currentPanel.classList.add("hidden-panel");

            // Fallback if transitionend doesn't fire
            setTimeout(() => {
              if (currentPanel.classList.contains("hidden-panel")) {
                currentPanel.removeEventListener(
                  "transitionend",
                  onTransitionEnd,
                );
                currentPanel.classList.add("hidden");
                currentPanel.classList.remove("hidden-panel");
                showPanel(targetPanel);
                setTimeout(() => {
                  isTransitioning = false;
                }, 300);
              }
            }, 350);
          } else {
            showPanel(targetPanel);
            setTimeout(() => {
              isTransitioning = false;
            }, 300);
          }
        });
      })();

// --- Global Data Injection ---
      const PLAYWRIGHT_SUITES = __PLAYWRIGHT_SUITES_JSON__;
      const GRIMOIR_HISTORY = __HISTORY_DATA__;
      const glowPlugin = {
        id: "glow",
        beforeDatasetsDraw: function (chart) {
          const ctx = chart.ctx;
          ctx.save();
          ctx.shadowColor = "rgba(139, 92, 246, 0.4)";
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        },
        afterDatasetsDraw: function (chart) {
          chart.ctx.restore();
        },
      };

      const htmlLegendPlugin = {
        id: "htmlLegend",
        afterUpdate(chart) {
          const ul = document.getElementById("customPieLegend");
          if (!ul) return;
          while (ul.firstChild) {
            ul.firstChild.remove();
          }

          const items =
            chart.options.plugins.legend.labels.generateLabels(chart);
          const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

          items.forEach((item) => {
            const val = chart.data.datasets[0].data[item.index];
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;

            const li = document.createElement("div");
            li.className =
              "flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-surface-container transition-colors";
            li.onclick = () => {
              chart.toggleDataVisibility(item.index);
              chart.update();
            };

            const box = document.createElement("div");
            // Use solid colors instead of canvas gradients for the HTML legend
            const solidColors = ["#a78bfa", "#f87171", "#94a3b8"];
            const color = solidColors[item.index] || "#ffffff";
            box.style.background = color;
            box.className = "w-3 h-3 rounded-full shrink-0";

            const textContainer = document.createElement("div");
            textContainer.className = "flex items-baseline gap-2 flex-1";

            const label = document.createElement("span");
            label.className =
              "text-xs text-on-surface-variant font-label-caps uppercase tracking-wider";
            label.style.textDecoration = item.hidden ? "line-through" : "";
            label.innerText = item.text;

            textContainer.appendChild(label);
            li.appendChild(box);
            li.appendChild(textContainer);
            ul.appendChild(li);
          });
        },
      };

      const dataLabelsPlugin = {
        id: "dataLabels",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);

          meta.data.forEach((element, index) => {
            // Hide label if the slice is very small or hidden to prevent overlap
            if (element.hidden || element.circumference < Math.PI / 8) return;
            const val = chart.data.datasets[0].data[index];
            if (val === 0) return;

            const centerPoint = element.tooltipPosition();
            ctx.save();
            ctx.font = "bold 22px 'Playfair Display', serif";
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 6;
            ctx.fillText(val.toString(), centerPoint.x, centerPoint.y);
            ctx.restore();
          });
        },
      };

      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1500,
          easing: "easeOutElastic",
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#cbc3d7",
              usePointStyle: true,
              padding: 20,
              font: { size: 11, family: "Inter", weight: "500" },
            },
          },
          tooltip: {
            backgroundColor: "rgba(15, 13, 21, 0.9)",
            titleColor: "#cbc3d7",
            bodyColor: "#e9e7ec",
            borderColor: "rgba(203, 195, 215, 0.2)",
            borderWidth: 1,
            padding: 12,
            usePointStyle: true,
          },
        },
      };

      const tabChartOptions = {
        ...chartOptions,
        animation: false,
      };

      // Overview execution status chart
      const ctxStatus = document
        .getElementById("overviewStatusChart")
        .getContext("2d");

      const passedGrad = ctxStatus.createLinearGradient(0, 0, 300, 300);
      passedGrad.addColorStop(0, "rgba(196, 181, 253, 1)");
      passedGrad.addColorStop(1, "rgba(109, 40, 217, 1)");

      const failedGrad = ctxStatus.createLinearGradient(0, 0, 300, 300);
      failedGrad.addColorStop(0, "rgba(252, 165, 165, 1)");
      failedGrad.addColorStop(1, "rgba(185, 28, 28, 1)");

      const skippedGrad = ctxStatus.createLinearGradient(0, 0, 300, 300);
      skippedGrad.addColorStop(0, "rgba(216, 212, 223, 1)");
      skippedGrad.addColorStop(1, "rgba(71, 85, 105, 1)");

      const overviewStatusChartInstance = new Chart(ctxStatus, {
        type: "pie",
        data: {
          labels: ["Passed", "Failed", "Skipped"],
          datasets: [
            {
              data: __OVERALL_STATUS_ARRAY__,
              backgroundColor: [passedGrad, failedGrad, skippedGrad],
              borderColor: "transparent",
              borderWidth: 0,
              hoverOffset: 20,
            },
          ],
        },
        options: {
          ...chartOptions,
          layout: { padding: 20 },
          animation: {
            duration: 2500,
            easing: "easeOutQuart",
            animateRotate: true,
            animateScale: false,
            onComplete: function (context) {
              if (context.initial) {
                context.chart.options.animation.duration = 1200;
                // Force a relayout to fix any initial off-center rendering issues in Chart.js
                setTimeout(() => {
                  context.chart.update('none');
                }, 50);
              }
            },
          },
          plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
          },
          scales: {
            x: { display: false },
            y: { display: false },
          },
        },
        plugins: [glowPlugin, htmlLegendPlugin, dataLabelsPlugin],
      });

      // Force immediate relayout to fix Chart.js initial rendering bug
      setTimeout(() => {
        overviewStatusChartInstance.update('none');
      }, 50);

      // Overview execution duration by type chart
      const ctxDuration = document
        .getElementById("overviewDurationChart")
        .getContext("2d");
      const durationGrad = ctxDuration.createLinearGradient(0, 0, 0, 400);
      durationGrad.addColorStop(0, "rgba(167, 139, 250, 1)"); // Morado
      durationGrad.addColorStop(1, "transparent");

      const hoverGrad = ctxDuration.createLinearGradient(0, 0, 0, 400);
      hoverGrad.addColorStop(0, "rgba(251, 191, 36, 1)"); // Amarillo / Dorado
      hoverGrad.addColorStop(1, "transparent");

      const barLabelsPlugin = {
        id: "barLabels",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          
          meta.data.forEach((bar, index) => {
            const val = chart.data.datasets[0].data[index];
            if (!val) return;
            
            ctx.save();
            ctx.font = "bold 10px 'JetBrains Mono', monospace";
            const text = `${val}ms`;
            const textWidth = ctx.measureText(text).width;
            
            const paddingX = 6;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = 18;
            const boxX = bar.x - boxWidth / 2;
            const boxY = bar.y - boxHeight - 8; // Restored original offset
            
            // Draw glass capsule background
            ctx.fillStyle = "rgba(15, 13, 21, 0.7)";
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 9);
            } else {
              ctx.rect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.fill();
            ctx.strokeStyle = "rgba(203, 195, 215, 0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw text
            ctx.fillStyle = "#e9e7ec";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bar.x, boxY + boxHeight / 2 + 1);
            ctx.restore();
          });
        }
      };

      const overviewDurationChartInstance = new Chart(ctxDuration, {
        type: "bar",
        data: {
          labels: __DURATION_LABELS__,
          datasets: [
            {
              label: "",
              data: __DURATION_DATA__,
              backgroundColor: durationGrad,
              borderRadius: 6,
              barPercentage: 0.25,
              categoryPercentage: 0.5,
              borderWidth: 0,
              hoverBackgroundColor: hoverGrad,
              animation: {
                delay: (context) => context.dataIndex * 150,
              },
            },
          ],
        },
        options: {
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...chartOptions.plugins?.tooltip,
              callbacks: {
                label: (context) => `${context.label}: ${context.raw} ms`,
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: { color: "#cbc3d7", font: { family: "JetBrains Mono" } },
            },
            y: {
              grid: {
                color: "rgba(255, 255, 255, 0.05)",
                drawBorder: false,
              },
              ticks: { color: "#cbc3d7", font: { family: "'Playfair Display', serif" } },
            },
          },
        },
        plugins: [glowPlugin, barLabelsPlugin],
      });

      // Lazy chart initializers for secondary tabs
      const tabCharts = {
        automated: null,
        perf: null,
      };

      // Removed initAutomatedChart as the chart was replaced by the split pane

      function initPerfChart() {
        if (tabCharts.perf) return;
        const ctx = document.getElementById("perfChart");
        if (!ctx) return;
        tabCharts.perf = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Avg", "Min", "Max", "P90", "P95"],
            datasets: [
              {
                label: "Response Time (ms)",
                data: __K6_DATA_ARRAY__,
                backgroundColor: "#FBBF24",
                borderRadius: 4,
              },
            ],
          },
          options: {
            ...tabChartOptions,
            scales: {
              x: { ticks: { color: "#cbc3d7" } },
              y: { ticks: { color: "#cbc3d7" } },
            },
          },
        });
      }

      // Collapsible sections with smooth height animation
      (function () {
        document.querySelectorAll(".collapsible-section").forEach((section) => {
          const header = section.querySelector(".collapsible-header");
          const content = section.querySelector(".collapsible-content");
          const icon = section.querySelector(".toggle-icon");
          if (!header || !content) return;

          header.addEventListener("click", () => {
            const expanded = section.getAttribute("data-expanded") === "true";
            section.setAttribute("data-expanded", String(!expanded));

            if (expanded) {
              // Collapse
              const naturalHeight = content.scrollHeight;
              content.style.height = naturalHeight + "px";
              content.classList.add("animating");
              if (typeof anime !== "undefined") {
                anime({
                  targets: content,
                  height: 0,
                  opacity: 0,
                  duration: 300,
                  easing: "easeInOutQuad",
                  complete: () => {
                    content.classList.add("hidden");
                    content.classList.remove("animating");
                    content.style.height = "";
                  },
                });
              } else {
                content.classList.add("hidden");
                content.classList.remove("animating");
              }
            } else {
              // Expand
              content.classList.remove("hidden");
              content.classList.add("animating");
              const naturalHeight = content.scrollHeight;
              content.style.height = "0px";
              content.style.opacity = "0";
              if (typeof anime !== "undefined") {
                anime({
                  targets: content,
                  height: naturalHeight,
                  opacity: 1,
                  duration: 300,
                  easing: "easeOutQuad",
                  complete: () => {
                    content.classList.remove("animating");
                    content.style.height = "auto";
                  },
                });
              } else {
                content.classList.remove("animating");
                content.style.height = "auto";
                content.style.opacity = "1";
              }
            }

            if (icon)
              icon.style.transform = expanded
                ? "rotate(-90deg)"
                : "rotate(0deg)";
          });
        });
      })();

      // Failures pagination and error modal
      (function () {
        const rowsPerPage = 5;
        const tableBody = document.getElementById("failuresTableBody");
        const pagination = document.getElementById("failuresPagination");
        const prevBtn = document.getElementById("failuresPrev");
        const nextBtn = document.getElementById("failuresNext");
        const pageInfo = document.getElementById("failuresPageInfo");
        const searchInput = document.getElementById("failureSearch");
        const countBadge = document.getElementById("failuresCountBadge");
        const modal = document.getElementById("errorModal");
        const modalContent = document.getElementById("errorModalContent");
        const closeModal = document.getElementById("closeErrorModal");

        if (!tableBody) return;

        const allRows = Array.from(tableBody.querySelectorAll(".failure-row"));
        let filteredRows = [...allRows];
        let currentPage = 1;

        function updatePagination() {
          const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;
          if (currentPage > totalPages) currentPage = totalPages;
          if (currentPage < 1) currentPage = 1;

          if (countBadge) {
            countBadge.textContent = String(filteredRows.length);
            countBadge.classList.remove("hidden");
          }

          const start = (currentPage - 1) * rowsPerPage;
          const end = start + rowsPerPage;

          allRows.forEach((row) => row.classList.add("hidden"));
          filteredRows.forEach((row, index) => {
            if (index >= start && index < end) {
              row.classList.remove("hidden");
            }
          });

          if (pagination) {
            pagination.classList.toggle(
              "hidden",
              filteredRows.length <= rowsPerPage,
            );
          }
          if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages}`;
          if (prevBtn) prevBtn.disabled = currentPage === 1;
          if (nextBtn) nextBtn.disabled = currentPage === totalPages;
        }

        if (searchInput) {
          const debouncedFailuresSearch = typeof debounce === 'function' ? debounce((query) => {
            filteredRows = allRows.filter((row) => {
              const text = row.textContent.toLowerCase();
              return text.includes(query);
            });
            currentPage = 1;
            updatePagination();
          }, 300) : null;
          
          searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (debouncedFailuresSearch) {
              debouncedFailuresSearch(query);
            } else {
              // Fallback
              filteredRows = allRows.filter((row) => row.textContent.toLowerCase().includes(query));
              currentPage = 1;
              updatePagination();
            }
          });
        }

        if (prevBtn) {
          prevBtn.addEventListener("click", () => {
            if (currentPage > 1) {
              currentPage--;
              updatePagination();
            }
          });
        }

        if (nextBtn) {
          nextBtn.addEventListener("click", () => {
            const totalPages =
              Math.ceil(filteredRows.length / rowsPerPage) || 1;
            if (currentPage < totalPages) {
              currentPage++;
              updatePagination();
            }
          });
        }

        updatePagination();

        function openModal(errorHtml) {
          if (!modalContent || !modal || !errorHtml) return;
          modalContent.innerHTML = errorHtml;
          modal.classList.remove("hidden");
          modal.classList.add("flex");
          void modal.offsetWidth;
          modal.classList.add("open");
        }

        function closeModalFn() {
          if (!modal) return;
          modal.classList.remove("open");
          setTimeout(() => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
          }, 200);
        }

        tableBody.addEventListener("click", (e) => {
          const btn = e.target.closest(".view-error-btn");
          if (!btn) return;
          const errorHtml = btn.getAttribute("data-error-html");
          openModal(errorHtml);
        });

        if (closeModal && modal) {
          closeModal.addEventListener("click", closeModalFn);
          modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModalFn();
          });
        }
      })();

      // Automated Cases Live Search and Status Filter Logic
      (function () {
        const searchInput = document.getElementById("automatedSearch");
        const filterContainer = document.getElementById(
          "automatedFilterButtons",
        );
        const tableBody = document.getElementById("automatedTableBody");
        const visibleCountSpan = document.getElementById("autoVisibleCount");
        const noResultsDiv = document.getElementById("noAutomatedResults");

        if (!tableBody) return;

        let activeFilter = "all";
        let searchQuery = "";

        function filterAutomatedTable() {
          const rows = Array.from(
            tableBody.querySelectorAll("tr.automated-row"),
          );
          let visibleCount = 0;

          rows.forEach((row) => {
            const suiteText = (row.cells[0]?.textContent || "").toLowerCase();
            const testText = (row.cells[1]?.textContent || "").toLowerCase();
            const statusText = (row.cells[2]?.textContent || "")
              .toLowerCase()
              .trim();

            const matchesSearch =
              !searchQuery ||
              suiteText.includes(searchQuery) ||
              testText.includes(searchQuery);

            const matchesStatus =
              activeFilter === "all" || statusText.includes(activeFilter);

            if (matchesSearch && matchesStatus) {
              row.classList.remove("hidden");
              visibleCount++;
            } else {
              row.classList.add("hidden");
            }
          });

          if (visibleCountSpan)
            visibleCountSpan.textContent = visibleCount.toString();
          if (noResultsDiv) {
            if (visibleCount === 0 && rows.length > 0) {
              noResultsDiv.classList.remove("hidden");
            } else {
              noResultsDiv.classList.add("hidden");
            }
          }
        }

        if (searchInput) {
          const debouncedPerfSearch = typeof debounce === 'function' ? debounce((val) => {
            searchQuery = val;
            filterAutomatedTable();
          }, 300) : null;
          
          searchInput.addEventListener("input", (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (debouncedPerfSearch) {
              debouncedPerfSearch(val);
            } else {
              searchQuery = val;
              filterAutomatedTable();
            }
          });
        }

        if (filterContainer) {
          filterContainer.addEventListener("click", (e) => {
            const btn = e.target.closest(".auto-filter-btn");
            if (!btn) return;

            filterContainer
              .querySelectorAll(".auto-filter-btn")
              .forEach((b) => {
                b.classList.remove(
                  "active",
                  "bg-primary/20",
                  "text-primary",
                  "border-primary/40",
                );
                b.classList.add(
                  "bg-surface-container",
                  "text-on-surface-variant",
                  "border-outline-variant/40",
                );
              });

            btn.classList.add(
              "active",
              "bg-primary/20",
              "text-primary",
              "border-primary/40",
            );
            btn.classList.remove(
              "bg-surface-container",
              "text-on-surface-variant",
              "border-outline-variant/40",
            );

            activeFilter = btn.getAttribute("data-filter") || "all";
            filterAutomatedTable();
          });
        }
      })();

      // --- 4. Historical Trend Chart ---
      if (typeof GRIMOIR_HISTORY !== 'undefined' && Array.isArray(GRIMOIR_HISTORY)) {
        const trendContainer = document.getElementById('trendChartContainer');
        if (trendContainer) {
          if (GRIMOIR_HISTORY.length <= 1) {
            trendContainer.innerHTML = `<div class="absolute inset-0 flex flex-col items-center justify-center text-outline-variant">
              <span class="material-symbols-outlined text-[32px] mb-2 opacity-50">show_chart</span>
              <p class="text-sm">Waiting for more runs to show trends...</p>
            </div>`;
          } else {
            trendContainer.innerHTML = '<canvas id="overviewTrendChart"></canvas>';
            const ctxTrend = document.getElementById("overviewTrendChart").getContext("2d");
            
            const labels = GRIMOIR_HISTORY.map((h, index) => {
              const d = new Date(h.date);
              return 'Run ' + (index + 1) + ' (' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ')';
            });
            const passedData = GRIMOIR_HISTORY.map(h => h.passed);
            const failedData = GRIMOIR_HISTORY.map(h => h.failed);
            
            new Chart(ctxTrend, {
              type: "line",
              data: {
                labels: labels,
                datasets: [
                  {
                    label: "Passed",
                    data: passedData,
                    borderColor: "#34d399",
                    backgroundColor: "rgba(52, 211, 153, 0.1)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                  },
                  {
                    label: "Failed",
                    data: failedData,
                    borderColor: "#f87171",
                    backgroundColor: "rgba(248, 113, 113, 0.1)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: { color: "#9ca3af", font: { family: "'Inter', sans-serif", size: 11 } }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255, 255, 255, 0.05)" },
                    ticks: { color: "#9ca3af", precision: 0 }
                  },
                  x: {
                    grid: { display: false },
                    ticks: { color: "#9ca3af", maxRotation: 0, minRotation: 0 }
                  }
                }
              }
            });
          }
        }
      }

      // Counter animation for KPI numbers using anime.js spring with manual fallback
      (function () {
        const counters = document.querySelectorAll(".counter");

        function animateCounterManual(counter, target, isFloat, isDuration) {
          const duration = 1200;
          const startTime = performance.now();
          function easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
          }
          function update(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const current = target * easeOutQuart(progress);
            
            if (isDuration) {
              counter.textContent = formatDuration(current);
            } else {
              counter.textContent = isFloat
                ? current.toFixed(2)
                : Math.round(current).toString();
            }
            if (progress < 1) requestAnimationFrame(update);
          }
          requestAnimationFrame(update);
        }

        counters.forEach((counter) => {
          const rawTarget = counter.getAttribute("data-target");
          if (rawTarget === null || rawTarget === "") return;
          const target = parseFloat(rawTarget);
          if (Number.isNaN(target)) return;
          const isFloat = target % 1 !== 0;
          const isDuration = counter.hasAttribute("data-is-duration");

          if (typeof anime !== "undefined") {
            const animObj = { value: 0 };
            anime({
              targets: animObj,
              value: target,
              round: isFloat ? 100 : 1,
              easing: "spring(1, 80, 12, 0)",
              update: () => {
                const current = animObj.value;
                if (isDuration) {
                  counter.textContent = formatDuration(current);
                } else {
                  counter.textContent = isFloat
                    ? current.toFixed(2)
                    : Math.round(current).toString();
                }
              },
            });
          } else {
            animateCounterManual(counter, target, isFloat, isDuration);
          }
        });
      })();

      // Health score gauge animation
      (function () {
        const gaugeArc = document.getElementById("healthGaugeArc");
        if (!gaugeArc) return;

        const arcLength = parseFloat(gaugeArc.getAttribute("stroke-dasharray"));
        const targetOffset = parseFloat(
          gaugeArc.getAttribute("data-target-offset"),
        );
        if (Number.isNaN(arcLength) || Number.isNaN(targetOffset)) return;

        function animateGaugeManual() {
          const duration = 1200;
          const startTime = performance.now();
          function easeOutQuart(t) {
            return 1 - Math.pow(1 - t, 4);
          }
          function update(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const current =
              arcLength - (arcLength - targetOffset) * easeOutQuart(progress);
            gaugeArc.setAttribute("stroke-dashoffset", current.toString());
            if (progress < 1) requestAnimationFrame(update);
          }
          requestAnimationFrame(update);
        }

        if (typeof anime !== "undefined") {
          anime({
            targets: gaugeArc,
            strokeDashoffset: [arcLength, targetOffset],
            easing: "spring(1, 80, 12, 0)",
            duration: 1400,
            delay: 300,
          });
        } else {
          animateGaugeManual();
        }
      })();

      // Scroll progress indicator
      (function () {
        const progressBar = document.getElementById("scrollProgress");
        if (!progressBar) return;

        function updateProgress() {
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop;
          const docHeight =
            document.documentElement.scrollHeight -
            document.documentElement.clientHeight;
          const ratio = docHeight > 0 ? scrollTop / docHeight : 0;
          progressBar.style.height = `${(1 - ratio) * 100}%`;
        }

        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);
        updateProgress();
      })();

      // Title character animation
      (function () {
        const title = document.getElementById("grimoireTitle");
        if (!title || typeof anime === "undefined") return;

        const text = title.textContent.trim();
        title.innerHTML = text
          .split("")
          .map(
            (char) =>
              `<span class="inline-block" style="opacity:0">${char === " " ? "&nbsp;" : char}</span>`,
          )
          .join("");

        anime({
          targets: "#grimoireTitle span",
          translateY: [20, 0],
          opacity: [0, 1],
          delay: anime.stagger(60, { start: 100 }),
          easing: "easeOutExpo",
          duration: 800,
        });
      })();

      // anime.js stagger animations
      (function () {
        if (typeof anime === "undefined") return;

        // Stagger failure rows on initial load
        anime({
          targets: ".failure-row",
          translateX: [-16, 0],
          opacity: [0, 1],
          delay: anime.stagger(60, { start: 600 }),
          easing: "easeOutExpo",
          duration: 700,
        });

        // Stagger coverage chips
        anime({
          targets: "#tab-overview .bg-surface-container.rounded-md",
          scale: [0.9, 1],
          opacity: [0, 1],
          delay: anime.stagger(60, { start: 400 }),
          easing: "easeOutBack",
          duration: 500,
        });

        // Stagger automated test rows
        anime({
          targets: ".automated-row",
          translateY: [12, 0],
          opacity: [0, 1],
          delay: anime.stagger(50, { start: 500 }),
          easing: "easeOutExpo",
          duration: 600,
        });

        // Stagger performance metric rows
        anime({
          targets: ".perf-metric-row",
          translateX: [16, 0],
          opacity: [0, 1],
          delay: anime.stagger(60, { start: 500 }),
          easing: "easeOutExpo",
          duration: 600,
        });
      })();
      // === AUTOMATED SPLIT PANE LOGIC ===
      function escapeHtml(unsafe) {
        if (!unsafe) return "";
        return String(unsafe)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function formatDuration(ms) {
        if (ms == null) return "0ms";
        if (ms >= 60000) {
          const minutes = Math.floor(ms / 60000);
          const seconds = Math.floor((ms % 60000) / 1000);
          return `${minutes}.${seconds.toString().padStart(2, '0')}m`;
        }
        if (ms >= 1000) {
          const seconds = (ms / 1000).toFixed(1);
          return parseFloat(seconds) + "s";
        }
        return ms + "ms";
      }

      let allAutomatedTests = [];
      const extractedTags = new Set();
      let currentFilter = "all";
      let currentSearch = "";
      const expandedSuites = new Set();

      function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      }

      function normalizeStatusStr(s) {
        if (!s) return "skipped";
        const low = s.toLowerCase();
        if (low === "expected" || low === "passed") return "passed";
        if (low === "unexpected" || low === "failed" || low === "timedout" || low === "interrupted") return "failed";
        if (low === "flaky") return "passed";
        return "skipped";
      }

      function buildFlatTestList(suites, parentPath = "") {
        if (!suites) return;
        suites.forEach((suite) => {
          const path = parentPath
            ? `${parentPath} > ${suite.title}`
            : suite.title;

          if (suite.specs) {
            suite.specs.forEach((spec) => {
              if (spec.tests) {
                spec.tests.forEach((test) => {
                  if (!test.results || test.results.length === 0) return;
                  
                  const results = test.results;
                  const lastResult = results[results.length - 1];
                  const overallStatus = results.some(r => {
                    const status = normalizeStatusStr(r.status);
                    return status === 'failed';
                  }) ? 'failed' : normalizeStatusStr(lastResult.status);
                  const matchTags = spec.title.match(/@\w+/g);
                  if (matchTags) {
                    matchTags.forEach(t => extractedTags.add(t));
                  }

                  allAutomatedTests.push({
                    id: Math.random().toString(36).substr(2, 9),
                    suitePath: path,
                    name: spec.title,
                    projectName: test.projectName || '',
                    status: overallStatus,
                    duration: results.reduce((acc, r) => acc + (r.duration || 0), 0),
                    error: lastResult.error?.message || lastResult.errors?.[0]?.message || null,
                    errorObj: lastResult.error || (lastResult.errors?.[0] || null),
                    steps: lastResult.steps || [],
                    attachments: lastResult.attachments || [],
                    results: results
                  });
                });
              }
            });
          }

          if (suite.suites) {
            buildFlatTestList(suite.suites, path);
          }
        });
      }

      function renderTags() {
        const container = document.getElementById("automatedTagsContainer");
        if (!container || extractedTags.size === 0) return;
        
        let html = '';
        Array.from(extractedTags).sort().forEach(tag => {
           const isActive = currentSearch.includes(tag);
           const activeClass = isActive 
             ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_8px_rgba(139,92,246,0.2)]' 
             : 'bg-surface-container border-outline-variant/40 text-outline hover:text-on-surface hover:border-outline-variant';
           html += `<button type="button" class="tag-chip text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all ${activeClass}" data-tag="${tag}">${tag}</button>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.tag-chip').forEach(btn => {
           btn.addEventListener('click', (e) => {
              const tag = e.currentTarget.getAttribute('data-tag');
              const searchInput = document.getElementById('automatedSearch');
              
              if (currentSearch.includes(tag)) {
                currentSearch = currentSearch.replace(tag, '').replace(/\\s+/g, ' ').trim();
              } else {
                currentSearch = (currentSearch + ' ' + tag).trim();
              }
              
              if (searchInput) searchInput.value = currentSearch;
              renderAutomatedTree();
           });
        });
      }

      function renderAutomatedTree() {
        if (allAutomatedTests.length === 0 && PLAYWRIGHT_SUITES) {
          buildFlatTestList(PLAYWRIGHT_SUITES);
        }
        renderTags();

        const container = document.getElementById("automatedTreeContainer");
        if (!container) return;

        const filtered = allAutomatedTests.filter((t) => {
          if (currentFilter !== "all" && t.status !== currentFilter)
            return false;
          if (
            currentSearch &&
            !t.name.toLowerCase().includes(currentSearch.toLowerCase()) &&
            !t.suitePath.toLowerCase().includes(currentSearch.toLowerCase())
          )
            return false;
          return true;
        });

        const treeRoot = {};
        filtered.forEach((t) => {
          let parts = [];
          let pathStr = t.suitePath;
          let projectPart = "";
          const projMatch = pathStr.match(/^\[(.*?)\]\s*(.*)$/);
          if (projMatch) {
            projectPart = `[${projMatch[1]}]`;
            pathStr = projMatch[2];
          }
          
          const arrowParts = pathStr.split(" > ");
          arrowParts.forEach(ap => {
            const slashParts = ap.split("/");
            parts = parts.concat(slashParts);
          });
          parts = parts.map(p => p.trim()).filter(Boolean);
          
          let current = treeRoot;
          parts.forEach((part, i) => {
            if (!current[part]) {
              current[part] = { _tests: [], _children: {} };
            }
            if (i === parts.length - 1) {
               current[part]._tests.push(t);
            }
            current = current[part]._children;
          });
        });

        if (filtered.length === 0) {
          container.innerHTML =
            '<div class="text-center p-4 text-outline text-xs">No tests found.</div>';
          return;
        }

        function renderTreeNodes(node, parentPath = "", indent = 0) {
          let html = "";
          const keys = Object.keys(node).sort();
          keys.forEach(key => {
            const childNode = node[key];
            const currentPath = parentPath ? `${parentPath}/${key}` : key;
            const isFile = /\.(ts|js|mjs|tsx|jsx|php|py|rb|java|cs|go)$/i.test(key) || key.toLowerCase().includes('.spec.') || key.toLowerCase().includes('.test.');
            
            const isCollapsed = !expandedSuites.has(currentPath);
            const gridRows = isCollapsed ? '0fr' : '1fr';
            const chevronRotation = isCollapsed ? '-90deg' : '0deg';
            const iconName = isFile ? 'description' : (isCollapsed ? 'folder' : 'folder_open');
            const iconColor = isFile ? 'text-primary' : 'text-amber-400';
            const marginClass = indent > 0 ? 'mt-2' : '';
            const hideChevron = isFile && Object.keys(childNode._children).length === 0 && childNode._tests.length === 0 ? 'invisible' : '';
            
            html += `
            <div class="${marginClass} mb-2">
              <div class="suite-header font-label-caps text-sm text-on-surface-variant uppercase mb-1 flex items-center gap-1.5 cursor-pointer hover:text-primary hover:bg-surface-container rounded px-1.5 py-1 transition-colors select-none" data-suite="${escapeHtml(currentPath)}" data-is-file="${isFile}">
                <span class="material-symbols-outlined text-[18px] chevron-icon transition-transform duration-300 ${hideChevron}" style="transform: rotate(${chevronRotation});">expand_more</span>
                <span class="material-symbols-outlined text-[18px] folder-icon ${iconColor} transition-colors duration-300">${iconName}</span>
                <span class="font-bold tracking-wider truncate" title="${escapeHtml(key)}">${escapeHtml(key)}</span>
              </div>
              <div class="grid transition-[grid-template-rows] duration-300 ease-in-out suite-content" style="grid-template-rows: ${gridRows};">
                <div class="overflow-hidden">
            `;
            
            if (Object.keys(childNode._children).length > 0) {
              html += renderTreeNodes(childNode._children, currentPath, indent + 1);
            }
            
            if (childNode._tests.length > 0) {
              html += `<div class="flex flex-col gap-0.5 mt-1">`;
              childNode._tests.forEach(test => {
                const statusColor =
                  test.status === "passed"
                    ? "text-emerald-400"
                    : test.status === "failed"
                      ? "text-error"
                      : "text-outline";
                const statusIcon =
                  test.status === "passed"
                    ? "check_circle"
                    : test.status === "failed"
                      ? "cancel"
                      : "radio_button_unchecked";
                const bgHover =
                  test.status === "failed"
                    ? "hover:bg-error/10"
                    : "hover:bg-surface-container";
                
                const retriesBadge = test.results && test.results.length > 1 ? `<span class="bg-amber-500/10 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-mono border border-amber-500/30 whitespace-nowrap ml-2" title="${test.results.length} attempts total"><span class="material-symbols-outlined text-[10px] align-middle mr-0.5">replay</span>${test.results.length}</span>` : '';
                
                html += `
                  <div class="test-tree-item flex items-center gap-2.5 p-2 rounded cursor-pointer ${bgHover} transition-colors" data-id="${test.id}">
                    <span class="material-symbols-outlined text-base ${statusColor}">${statusIcon}</span>
                    <span class="font-body text-sm text-on-surface truncate flex-1 flex items-center" title="${escapeHtml(test.name)}">${escapeHtml(test.name)}${retriesBadge}</span>
                  </div>
                `;
              });
              html += `</div>`;
            }
            
            html += `</div></div></div>`;
          });
          return html;
        }

        container.innerHTML = renderTreeNodes(treeRoot);

        if (window.anime) {
          anime({
            targets: container.children,
            translateY: [15, 0],
            opacity: [0, 1],
            duration: 400,
            easing: "easeOutSine",
            delay: anime.stagger(40)
          });
        }
      }



      function showTestDetails(test) {
        try {
          document
            .getElementById("btnOpenAllure")
            .setAttribute("onclick", `openAllureModal('${test.id}')`);

          document
            .getElementById("automatedEmptyState")
            .classList.add("opacity-0", "pointer-events-none");
          document
            .getElementById("automatedEmptyState")
            .classList.remove("z-10");
          
          const contentState = document.getElementById("automatedContentState");
          contentState.classList.remove("opacity-0", "pointer-events-none", "animate-fade-in-up");
          void contentState.offsetWidth;
          contentState.classList.add("animate-fade-in-up");

          document.getElementById("detailTestName").textContent =
            test.name || "Unknown Test";
          document.getElementById("detailSuiteText").textContent =
            test.suitePath || "Unknown Suite";
          document.getElementById("detailDurationText").textContent = formatDuration(test.duration);

          const attemptsBadge = document.getElementById("detailAttemptsBadge");
          const attemptsText = document.getElementById("detailAttemptsText");
          if (test.results && test.results.length > 1) {
            attemptsBadge.classList.remove("hidden");
            attemptsText.textContent = test.results.length + " Attempts";
          } else {
            attemptsBadge.classList.add("hidden");
          }

          const badge = document.getElementById("detailStatusBadge");
          const dot = document.getElementById("detailStatusDot");
          const text = document.getElementById("detailStatusText");
          text.textContent = (test.status || "unknown").toUpperCase();

          badge.className =
            "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full border";
          dot.className = "w-1.5 h-1.5 rounded-full";
          if (test.status === "passed") {
            badge.classList.add(
              "bg-emerald-400/10",
              "text-emerald-400",
              "border-emerald-400/30"
            );
            dot.classList.add("bg-emerald-400");
          } else if (test.status === "failed") {
            badge.classList.add("bg-error/10", "text-error", "border-error/30");
            dot.classList.add("bg-error");
          } else {
            badge.classList.add(
              "bg-surface-container",
              "text-outline",
              "border-outline-variant",
            );
            dot.classList.add("bg-outline");
          }

          const tabBtnExecutions = document.getElementById("tabBtnExecutions");
          const tabBtnArtifacts = document.getElementById("tabBtnArtifacts");
          
          let execHtml = "";
          let artiHtml = "";
          let historyHtml = "";
          
          const results = test.results || [];
          const lastResult = results.length > 0 ? results[results.length - 1] : {};
          
          const stepsToRender = test.steps || lastResult.steps || [];
          const attachmentsToRender = test.attachments || lastResult.attachments || [];
          
          // --- Execution Tab ---
          const mainErrorObj = test.errorObj || lastResult.error || (lastResult.errors && lastResult.errors.length > 0 ? lastResult.errors[0] : null);
          const mainErrorMsg = test.error || mainErrorObj?.message || (typeof lastResult.error === 'string' ? lastResult.error : null) || (typeof mainErrorObj === 'string' ? mainErrorObj : null);

          if (stepsToRender && stepsToRender.length > 0) {
            execHtml += `<div class="font-label-caps text-xs text-outline uppercase mt-3 mb-2">Execution Steps</div>`;
            execHtml += renderSteps(stepsToRender, test);
          } else {
            execHtml += `<div class="text-outline text-sm italic mt-2">No steps recorded.</div>`;
          }
          
          // --- Artifacts Tab ---
          if (attachmentsToRender && attachmentsToRender.length > 0) {
            tabBtnArtifacts.classList.remove("hidden");
            artiHtml += `<div class="font-label-caps text-xs text-outline uppercase mt-3 mb-2">Attachments</div>`;
            artiHtml += `<div class="flex flex-col gap-4">`;
            attachmentsToRender.forEach(att => {
              artiHtml += `
              <div class="flex flex-col gap-1 bg-surface-container-low/50 rounded border border-outline-variant/30 overflow-hidden group">
                <div class="flex items-center gap-2 cursor-pointer hover:bg-surface-container-low p-2.5 transition-colors select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.att-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                  <span class="material-symbols-outlined text-[18px] att-chevron transition-transform duration-300 text-outline-variant group-hover:text-on-surface shrink-0" style="transform: rotate(-90deg);">expand_more</span>
                  <span class="material-symbols-outlined text-[16px] text-primary">attachment</span>
                  <span class="font-body text-sm font-semibold text-on-surface group-hover:text-primary transition-colors flex-1">${escapeHtml(att.name)}</span>
                </div>
                <div class="grid transition-[grid-template-rows] duration-300 ease-in-out" style="grid-template-rows: 0fr;">
                  <div class="overflow-hidden">
                    <div class="p-3 border-t border-outline-variant/20 bg-surface-container-lowest/50">`;
              
              if (att.name && att.name.toLowerCase().includes('trace') || (att.path && att.path.endsWith('.zip'))) {
                artiHtml += `
                  <div class="bg-surface-container border border-primary/20 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="material-symbols-outlined text-primary text-[20px]">troubleshoot</span>
                      <h4 class="font-bold text-on-surface text-sm">Playwright Trace Viewer</h4>
                    </div>
                    <p class="text-xs text-on-surface-variant mb-4 leading-relaxed">
                      Explore a full timeline of your test execution including DOM snapshots, network requests, and console logs.
                    </p>
                    
                    <div class="flex flex-col gap-3">
                      <!-- Option 1: Web -->
                      <div class="bg-surface-container-lowest/50 border border-outline-variant/30 rounded p-3">
                        <div class="text-[10px] font-bold text-on-surface mb-2 font-label-caps uppercase">Option 1: View in Browser</div>
                        <div class="flex items-center justify-between">
                          <span class="text-xs text-outline text-wrap flex-1 mr-2 leading-relaxed">Download the trace and drop it into <a href="https://trace.playwright.dev" target="_blank" class="text-primary hover:underline">trace.playwright.dev</a></span>
                          ${att.path ? `<a href="${att.path}" download class="shrink-0 flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-on-primary transition-colors">
                            <span class="material-symbols-outlined text-[16px]">download</span> Download
                          </a>` : `<span class="text-xs text-error">File path missing</span>`}
                        </div>
                      </div>

                      <!-- Option 2: Local CLI -->
                      <div class="bg-surface-container-lowest/50 border border-outline-variant/30 rounded p-3">
                        <div class="text-[10px] font-bold text-on-surface mb-2 font-label-caps uppercase">Option 2: Run Locally</div>
                        <div class="flex items-center gap-2 bg-[#0d1117] rounded border border-outline-variant/20 p-2 group">
                          <span class="material-symbols-outlined text-outline text-[16px]">terminal</span>
                          <code class="font-mono text-[11px] text-emerald-400/90 flex-1 overflow-x-auto whitespace-nowrap custom-scrollbar">npx playwright show-trace ${att.path ? escapeHtml(att.path) : '[trace-file]'}</code>
                          ${att.path ? `<button type="button" onclick="navigator.clipboard.writeText('npx playwright show-trace ${escapeHtml(att.path)}'); this.querySelector('span').textContent = 'check'; setTimeout(() => this.querySelector('span').textContent = 'content_copy', 2000)" class="text-outline hover:text-primary transition-colors shrink-0 p-0.5" title="Copy command">
                            <span class="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              } else if (att.contentType && att.contentType.startsWith('image/')) {
                artiHtml += `<img src="${att.path || 'data:image/png;base64,' + (att.body || '')}" alt="${escapeHtml(att.name)}" class="rounded max-w-full border border-outline-variant/20 shadow-sm cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open(this.src, '_blank')" />`;
              } else if (att.contentType && att.contentType.startsWith('video/')) {
                artiHtml += `<video controls src="${att.path || ''}" class="rounded max-w-full border border-outline-variant/20 shadow-sm"></video>`;
              } else {
                artiHtml += `<a href="${att.path || '#'}" target="_blank" class="text-primary hover:underline text-sm flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">download</span> Download File</a>`;
              }
              artiHtml += `
                    </div>
                  </div>
                </div>
              </div>`;
            });
            artiHtml += `</div>`;
          } else {
            tabBtnArtifacts.classList.add("hidden");
            artiHtml = `<div class="text-outline text-sm italic mt-2">No attachments found.</div>`;
          }
          
          // --- Executions History Tab ---
          if (results.length > 0) {
            tabBtnExecutions.classList.remove("hidden");
            historyHtml += `<div class="font-label-caps text-xs text-outline uppercase mt-3 mb-2">Execution History</div>`;
            historyHtml += `<div class="flex flex-col gap-3">`;
            
            results.forEach((r, idx) => {
              const isPassed = r.status === 'passed';
              const rStatusColor = isPassed ? 'emerald-400' : 'error';
              const rIcon = isPassed ? 'check_circle' : 'cancel';
              const rBgGradient = isPassed ? 'from-emerald-400/5 to-transparent' : 'from-error/5 to-transparent';
              const rBorder = isPassed ? 'border-l-emerald-400/50' : 'border-l-error/50';
              const rErrorObj = r.error || (r.errors && r.errors.length > 0 ? r.errors[0] : null);
              const rErrorMsg = rErrorObj?.message || (typeof r.error === 'string' ? r.error : null) || (typeof rErrorObj === 'string' ? rErrorObj : null);
              const startTime = r.startTime ? new Date(r.startTime).toLocaleString() : "Unknown Time";
              
              const hasError = !!rErrorMsg;
              const gridRows = "0fr";
              const chevronRot = "-90deg";

              historyHtml += `
              <div class="relative overflow-hidden bg-surface-container-low/50 rounded-lg border border-outline-variant/30 border-l-4 ${rBorder} shadow-sm group">
                <div class="relative flex flex-col">
                  <!-- Header (Clickable) -->
                  <div class="flex items-start justify-between p-4 cursor-pointer hover:bg-surface-container-low transition-colors select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.att-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-[20px] att-chevron transition-transform duration-300 text-outline-variant group-hover:text-on-surface shrink-0" style="transform: rotate(${chevronRot});">expand_more</span>
                      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-${rStatusColor}/10 text-${rStatusColor}">
                        <span class="material-symbols-outlined text-[18px]">${rIcon}</span>
                      </div>
                      <div>
                        <div class="text-sm font-bold text-on-surface">Attempt #${idx + 1}</div>
                        <div class="text-[11px] font-label-caps text-${rStatusColor} font-bold uppercase tracking-wider mt-0.5">${r.status}</div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 text-xs text-outline">
                      <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">calendar_today</span> ${startTime}</span>
                      <span class="flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">timer</span> ${formatDuration(r.duration || 0)}</span>
                    </div>
                  </div>
                  <!-- Content (Accordion) -->
                  <div class="grid transition-[grid-template-rows] duration-300 ease-in-out" style="grid-template-rows: ${gridRows};">
                    <div class="overflow-hidden">
                      <div class="px-14 pb-4 pt-1">
              `;
              if (hasError) {
                historyHtml += `<div class="bg-surface-container-highest border border-error/20 rounded overflow-hidden">`;
                
                // Location Bar
                if (rErrorObj?.location) {
                  const loc = rErrorObj.location;
                  historyHtml += `
                    <div class="bg-surface-container-lowest/50 border-b border-error/10 px-3 py-2 flex items-center gap-2 text-outline-variant font-mono text-[11px]">
                      <span class="material-symbols-outlined text-[14px]">description</span>
                      <span>${escapeHtml(loc.file)}:${loc.line}:${loc.column}</span>
                    </div>
                  `;
                }

                // Error Message
                historyHtml += `
                  <div class="p-3 ${rErrorObj?.snippet ? 'border-b border-error/10' : ''}">
                    <div class="flex items-center gap-2 mb-1.5 text-error font-semibold text-xs font-label-caps">
                      <span class="material-symbols-outlined text-[14px]">warning</span> Error Message
                    </div>
                    <pre class="font-mono text-[11.5px] text-error/90 whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(rErrorMsg)}</pre>
                  </div>
                `;

                // Snippet
                if (rErrorObj?.snippet) {
                  historyHtml += `
                    <div class="p-3 bg-surface-container-lowest/80">
                      <div class="flex items-center gap-2 mb-1.5 text-on-surface-variant font-semibold text-xs font-label-caps">
                        <span class="material-symbols-outlined text-[14px]">code</span> Source Snippet
                      </div>
                      <pre class="font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(rErrorObj.snippet)}</pre>
                    </div>
                  `;
                }

                historyHtml += `</div>`;
              } else {
                 historyHtml += `<div class="text-xs text-outline italic">Execution succeeded without errors.</div>`;
              }
              historyHtml += `
                      </div>
                    </div>
                  </div>
                </div>
              </div>`;
            });
            historyHtml += `</div>`;
          } else {
            tabBtnExecutions.classList.add("hidden");
          }

          document.getElementById("detailExecutionBody").innerHTML = execHtml;
          document.getElementById("detailExecutionsTabBody").innerHTML = historyHtml;
          document.getElementById("detailArtifactsBody").innerHTML = artiHtml;
          switchDetailTab('execution');
        } catch(e) {
          console.error("Error displaying test details:", e);
        }
      }

      function closeAllureModal() {
        const modal = document.getElementById("allureModal");
        if (modal) {
          modal.classList.remove("open");
          const content = modal.querySelector('.modal-content');
          if (content) {
            content.style.transform = 'scale(0.95)';
            content.style.opacity = '0';
          }
          if (window.allureCloseTimeout) clearTimeout(window.allureCloseTimeout);
          window.allureCloseTimeout = setTimeout(() => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
          }, 300);
        }
      }

            function openAllureModal(testId) {
        if (window.allureCloseTimeout) clearTimeout(window.allureCloseTimeout);
        
        const testIndex = allAutomatedTests.findIndex(t => t.id === testId);
        if (testIndex === -1) return;
        const test = allAutomatedTests[testIndex];
        
        // Setup pagination
        const prevBtn = document.getElementById("allureModalPrevBtn");
        const nextBtn = document.getElementById("allureModalNextBtn");
        document.getElementById("allureModalCounter").textContent = `${testIndex + 1} / ${allAutomatedTests.length}`;
        
        if (testIndex > 0) {
           prevBtn.disabled = false;
           prevBtn.onclick = () => openAllureModal(allAutomatedTests[testIndex - 1].id);
        } else {
           prevBtn.disabled = true;
           prevBtn.onclick = null;
        }

        if (testIndex < allAutomatedTests.length - 1) {
           nextBtn.disabled = false;
           nextBtn.onclick = () => openAllureModal(allAutomatedTests[testIndex + 1].id);
        } else {
           nextBtn.disabled = true;
           nextBtn.onclick = null;
        }
        
        document.getElementById("allureTestName").textContent = test.name || "Unknown Test";
        document.getElementById("allureDurationText").textContent = formatDuration(test.duration);
        document.getElementById("allureProjectText").textContent = test.projectName || "default";
        document.getElementById("allureSuiteText").textContent = test.suitePath || "Unknown Suite";
        
        // Status Badges
        const statusBadge = document.getElementById("allureStatusBadge");
        const statusIcon = document.getElementById("allureStatusIcon");
        const statusText = document.getElementById("allureStatusText");
        
        statusBadge.className = "flex items-center gap-1.5 px-2.5 py-1 rounded-full border ";
        if (test.status === "passed") {
          statusBadge.className += "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
          statusIcon.textContent = "check_circle";
          statusText.textContent = "Aprobado";
        } else if (test.status === "failed") {
          statusBadge.className += "bg-error/15 text-error border-error/30";
          statusIcon.textContent = "cancel";
          statusText.textContent = "Fallido";
        } else {
          statusBadge.className += "bg-outline-variant/20 text-outline border-outline-variant/30";
          statusIcon.textContent = "do_not_disturb_on";
          statusText.textContent = "Omitido";
        }
        
        // Tags Grid
        let tagsGridHtml = '';
        const allTags = [
          { label: 'language', value: 'javascript' },
          { label: 'framework', value: 'playwright' },
          { label: 'package', value: test.suitePath },
          { label: 'suite', value: test.suitePath }
        ];
        
        const explicitTags = ((test.name || "").match(/@\w+/g) || []);
        explicitTags.forEach(t => allTags.push({ label: 'tag', value: t }));

        const visibleTags = allTags.slice(0, 4);
        const hiddenTags = allTags.slice(4);

        function renderTag(t, hidden = false) {
           return `
          <div class="grid grid-cols-[100px_1fr] items-center gap-y-2 ${hidden ? 'hidden-tag hidden' : ''}">
            <span class="text-on-surface-variant">${escapeHtml(t.label)}</span>
            <span class="inline-flex"><span class="bg-surface-container-highest text-on-surface border border-outline-variant/30 px-2 py-0.5 rounded text-xs font-mono truncate max-w-[200px]" title="${escapeHtml(t.value)}">${escapeHtml(t.value)}</span></span>
          </div>`;
        }

        allTags.forEach((t, index) => {
          tagsGridHtml += renderTag(t, index >= 4);
        });
        
        document.getElementById("allureTagsGrid").innerHTML = tagsGridHtml;
        document.getElementById("allureTagsCountBadge").textContent = allTags.length.toString();

        const showMoreBtn = document.getElementById("allureTagsShowMoreBtn");
        if (hiddenTags.length > 0) {
          showMoreBtn.classList.remove("hidden");
          showMoreBtn.textContent = `Show more (+${hiddenTags.length})`;
          showMoreBtn.onclick = function() {
            const isShowingAll = this.textContent.includes('Menos');
            document.querySelectorAll('.hidden-tag').forEach(el => el.classList.toggle('hidden', isShowingAll));
            this.textContent = isShowingAll 
              ? `Show more (+${hiddenTags.length})` 
              : `Mostrar menos`;
          };
        } else {
          showMoreBtn.classList.add("hidden");
        }

                let stepCount = 0;
        function renderAllureSteps(steps, indent = 0) {
          if (!steps || steps.length === 0) return "";
          let html = "";
          steps.forEach(step => {
            stepCount++;
            const isFailed = step.error;
            const statusIcon = isFailed ? "cancel" : "check_circle";
            const statusColor = isFailed ? "text-error" : "text-emerald-500";
            const hasChildren = step.steps && step.steps.length > 0;
            const hasChildWithError = hasChildren && step.steps.some(s => s.error);
            const shouldShowErrorBox = isFailed && step.error && !hasChildWithError;
            
            const paddingLeft = indent * 20;
            
            let stepErrorHtml = '';
            if (shouldShowErrorBox) {
               const errMsg = typeof step.error === 'string' ? step.error : step.error.message;
               stepErrorHtml += `<div class="pl-[${paddingLeft + 48}px] pr-4 py-2 flex flex-col gap-2">
                 <div class="bg-surface-container-highest border border-error/20 rounded overflow-hidden">
                   <div class="p-3 border-b border-error/10">
                     <div class="flex items-center gap-2 mb-1.5 text-error font-semibold text-xs font-label-caps">
                       <span class="material-symbols-outlined text-[14px]">warning</span> Error Message
                     </div>
                     <pre class="font-mono text-[11.5px] text-error/90 whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(errMsg)}</pre>
                   </div>`;
               if (test.errorObj && test.errorObj.snippet) {
                 stepErrorHtml += `
                   <div class="p-3 bg-surface-container-lowest/80">
                     <div class="flex items-center gap-2 mb-1.5 text-on-surface-variant font-semibold text-xs font-label-caps">
                       <span class="material-symbols-outlined text-[14px]">code</span> Source Snippet
                     </div>
                     <pre class="font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(test.errorObj.snippet)}</pre>
                   </div>`;
               }
               stepErrorHtml += `</div></div>`;
            }

            if (hasChildren) {
              html += `
              <div class="flex flex-col border-b border-outline-variant/10 last:border-0">
                <div class="flex items-center gap-2 cursor-pointer hover:bg-surface-container-highest p-1.5 rounded transition-colors group select-none text-[13px]" style="padding-left: ${paddingLeft}px" onclick="const c=this.nextElementSibling; const i=this.querySelector('.step-chevron'); const h=c.style.display==='none'; c.style.display=h?'block':'none'; i.style.transform=h?'rotate(0deg)':'rotate(-90deg)'">
                  <span class="material-symbols-outlined text-[16px] step-chevron transition-transform text-outline-variant group-hover:text-on-surface" style="transform: rotate(-90deg)">arrow_drop_down</span>
                  <span class="material-symbols-outlined text-[14px] ${statusColor}">${statusIcon}</span>
                  <span class="font-mono text-on-surface-variant text-[11px] w-4">${stepCount}</span>
                  <span class="text-on-surface group-hover:text-primary transition-colors truncate flex-1">${escapeHtml(step.title)}</span>
                  <span class="font-mono text-[11px] text-on-surface-variant">${formatDuration(step.duration)}</span>
                </div>
                <div class="step-children" style="display: none">
                  ${renderAllureSteps(step.steps, indent + 1)}
                </div>
              </div>`;
            } else {
              html += `
              <div class="flex flex-col border-b border-outline-variant/10 last:border-0">
                <div class="flex items-center gap-2 hover:bg-surface-container-highest p-1.5 rounded transition-colors text-[13px]" style="padding-left: ${paddingLeft + 24}px">
                  <span class="material-symbols-outlined text-[14px] ${statusColor}">${statusIcon}</span>
                  <span class="font-mono text-on-surface-variant text-[11px] w-4">${stepCount}</span>
                  <span class="text-on-surface truncate flex-1">${escapeHtml(step.title)}</span>
                  <span class="font-mono text-[11px] text-on-surface-variant">${formatDuration(step.duration)}</span>
                </div>
                ${stepErrorHtml}
              </div>`;
            }
          });
          return html;
        }

        let stepsHtml = renderAllureSteps(test.steps || []);
        
        document.getElementById("allureExecutionBody").innerHTML = stepsHtml;
        document.getElementById("allureStepsCountBadge").textContent = stepCount.toString();

        // Populate Reintentos Tab
        if (test.results && test.results.length > 1) {
          const tabBtn = document.getElementById("allureReintentosTabBtn");
          tabBtn.classList.remove("hidden");
          document.getElementById("allureAttemptsCountBadge").textContent = (test.results.length - 1).toString();
          
          let reintentosHtml = '<div class="flex flex-col gap-3">';
          test.results.forEach((res, idx) => {
             const statColor = normalizeStatusStr(res.status) === 'passed' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10' : 'text-error border-error/20 bg-error/10';
             const icon = normalizeStatusStr(res.status) === 'passed' ? 'check_circle' : 'cancel';
             reintentosHtml += `
               <div class="flex items-center justify-between p-3 rounded border border-outline-variant/20 bg-surface-container">
                 <div class="flex items-center gap-3">
                   <div class="flex items-center justify-center w-8 h-8 rounded-full ${statColor}">
                     <span class="material-symbols-outlined text-[16px]">${icon}</span>
                   </div>
                   <div class="flex flex-col">
                     <span class="text-sm font-bold text-on-surface">Attempt #${idx + 1}</span>
                     <span class="text-[11px] text-on-surface-variant">Duration: ${formatDuration(res.duration)}</span>
                   </div>
                 </div>
                 ${res.error ? `<span class="text-xs text-error font-mono bg-error/10 px-2 py-1 rounded truncate max-w-[200px]">${escapeHtml(res.error.message || '')}</span>` : ''}
               </div>
             `;
          });
          reintentosHtml += '</div>';
          document.getElementById("allureReintentosBody").innerHTML = reintentosHtml;
        } else {
          document.getElementById("allureReintentosTabBtn").classList.add("hidden");
        }

        // Populate Adjuntos Tab
        if (test.attachments && test.attachments.length > 0) {
          const adjBadge = document.getElementById("allureAdjuntosCountBadge");
          if (adjBadge) {
            adjBadge.textContent = test.attachments.length.toString();
            adjBadge.classList.remove("hidden");
          }
          
          let adjuntosHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
          test.attachments.forEach(att => {
             adjuntosHtml += `
               <div class="flex items-center justify-between p-3 rounded border border-outline-variant/20 bg-surface-container hover:border-primary/50 transition-colors group cursor-pointer">
                 <div class="flex items-center gap-3">
                   <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-[24px]">attachment</span>
                   <div class="flex flex-col">
                     <span class="text-sm font-bold text-on-surface truncate max-w-[150px]">${escapeHtml(att.name)}</span>
                     <span class="text-[10px] text-on-surface-variant font-mono">${escapeHtml(att.contentType)}</span>
                   </div>
                 </div>
                 <span class="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary">download</span>
               </div>
             `;
          });
          adjuntosHtml += '</div>';
          document.getElementById("allureAdjuntosBody").innerHTML = adjuntosHtml;
        } else {
          const adjBadge = document.getElementById("allureAdjuntosCountBadge");
          if (adjBadge) {
            adjBadge.textContent = '0';
            adjBadge.classList.add("hidden");
          }
        }

        const modal = document.getElementById("allureModal");
        if (modal) {
          modal.classList.remove("hidden");
          modal.classList.add("flex");
          
          // Reset tabs
          document.querySelectorAll('.allure-tab-content').forEach(el => {
            el.classList.add('hidden', 'opacity-0', 'translate-y-4');
            el.classList.remove('opacity-100', 'translate-y-0');
          });
          document.querySelectorAll('[data-allure-tab]').forEach(btn => {
             btn.className = "px-1 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2";
          });
          
          const resumenTab = document.getElementById("allureTab-resumen");
          const resumenBtn = document.querySelector('[data-allure-tab="resumen"]');
          if (resumenTab && resumenBtn) {
            resumenTab.classList.remove('hidden');
            resumenBtn.className = "px-1 py-3 text-sm font-bold text-on-surface border-b-2 border-primary transition-colors flex items-center gap-2";
            void resumenTab.offsetWidth;
            resumenTab.classList.remove('opacity-0', 'translate-y-4');
            resumenTab.classList.add('opacity-100', 'translate-y-0');
          }

          // Setup tab click listeners (only once)
          if (!modal.dataset.tabsInitialized) {
            document.querySelectorAll('[data-allure-tab]').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const targetName = e.currentTarget.getAttribute('data-allure-tab');
                
                document.querySelectorAll('[data-allure-tab]').forEach(b => {
                  b.className = "px-1 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2";
                });
                e.currentTarget.className = "px-1 py-3 text-sm font-bold text-on-surface border-b-2 border-primary transition-colors flex items-center gap-2";
                
                document.querySelectorAll('.allure-tab-content').forEach(contentDiv => {
                  contentDiv.classList.add('hidden', 'opacity-0', 'translate-y-4');
                  contentDiv.classList.remove('opacity-100', 'translate-y-0');
                });
                
                const targetDiv = document.getElementById('allureTab-' + targetName);
                if (targetDiv) {
                  targetDiv.classList.remove('hidden');
                  void targetDiv.offsetWidth; 
                  targetDiv.classList.remove('opacity-0', 'translate-y-4');
                  targetDiv.classList.add('opacity-100', 'translate-y-0');
                }
              });
            });
            modal.dataset.tabsInitialized = 'true';
          }

          // Modal Entry Animation
          const content = modal.querySelector('.modal-content');
          if (content) {
             content.style.transform = 'scale(0.95)';
             content.style.opacity = '0';
             content.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          }
          
          void modal.offsetWidth;
          
          modal.classList.add("open");
          if (content) {
             content.style.transform = 'scale(1)';
             content.style.opacity = '1';
          }
        }
      }

      function switchDetailTab(tabName) {
        const btnExec = document.getElementById("tabBtnExecution");
        const btnExecs = document.getElementById("tabBtnExecutions");
        const btnArti = document.getElementById("tabBtnArtifacts");
        
        const bodyExec = document.getElementById("detailExecutionBody");
        const bodyExecs = document.getElementById("detailExecutionsTabBody");
        const bodyArti = document.getElementById("detailArtifactsBody");

        // Reset all buttons
        [btnExec, btnExecs, btnArti].forEach(btn => {
          btn.classList.add("text-on-surface-variant", "border-transparent");
          btn.classList.remove("text-primary", "border-primary");
        });

        // Hide all bodies
        [bodyExec, bodyExecs, bodyArti].forEach(body => {
          body.classList.add("hidden");
        });

        if (tabName === 'execution') {
          btnExec.classList.add("text-primary", "border-primary");
          btnExec.classList.remove("text-on-surface-variant", "border-transparent");
          bodyExec.classList.remove("hidden");
        } else if (tabName === 'executions') {
          btnExecs.classList.add("text-primary", "border-primary");
          btnExecs.classList.remove("text-on-surface-variant", "border-transparent");
          bodyExecs.classList.remove("hidden");
        } else {
          btnArti.classList.add("text-primary", "border-primary");
          btnArti.classList.remove("text-on-surface-variant", "border-transparent");
          bodyArti.classList.remove("hidden");
        }
      }

      function stepHasError(step) {
        if (step.error) return true;
        if (step.steps && step.steps.length > 0) {
          return step.steps.some(stepHasError);
        }
        return false;
      }

      function renderSteps(steps, testRef = null, indent = 0) {
        if (!steps || steps.length === 0) return "";
        let html = `<div class="flex flex-col gap-1.5 ${indent > 0 ? "ml-4 border-l border-outline-variant/30 pl-3" : "ml-0"}">`;
        steps.forEach((step) => {
          const isFailed = stepHasError(step);
          const statusColor = isFailed ? "text-error" : "text-emerald-400";
          const statusIcon = isFailed ? "close" : "check";
          const hasChildren = step.steps && step.steps.length > 0;
          const initialGrid = isFailed ? '1fr' : '0fr';
          const initialRotate = isFailed ? 'rotate(0deg)' : 'rotate(-90deg)';
          
          const errorMessage = step.error ? (typeof step.error === 'string' ? step.error : (step.error.message || '')) : '';
          const hasChildWithError = hasChildren && step.steps.some(stepHasError);
          const shouldShowErrorBox = errorMessage && !hasChildWithError;
          let errorHtml = '';
          if (shouldShowErrorBox) {
            errorHtml += `<div class="mt-1.5 flex flex-col gap-2 bg-surface-container-lowest rounded border border-error/20 overflow-hidden">
               <div class="p-2 ${testRef && testRef.errorObj && testRef.errorObj.snippet ? 'border-b border-error/10' : ''}">
                 <pre class="font-mono text-xs text-error/80 whitespace-pre-wrap break-words">${escapeHtml(errorMessage)}</pre>
               </div>`;
            if (testRef && testRef.errorObj && testRef.errorObj.snippet) {
               errorHtml += `<div class="p-2 bg-surface-container-lowest/50">
                 <pre class="font-mono text-[11px] text-on-surface-variant whitespace-pre-wrap">${escapeHtml(testRef.errorObj.snippet)}</pre>
               </div>`;
            }
            errorHtml += `</div>`;
          }

          if (hasChildren) {
            html += `
            <div class="flex flex-col gap-1">
              <div class="flex items-start gap-2 cursor-pointer hover:bg-surface-container-low p-1 rounded transition-colors group select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.step-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                <span class="material-symbols-outlined text-[18px] step-chevron transition-transform duration-300 text-outline-variant group-hover:text-on-surface shrink-0 mt-[1px]" style="transform: ${initialRotate};">expand_more</span>
                <span class="material-symbols-outlined text-base ${statusColor} shrink-0 mt-[1px]">${statusIcon}</span>
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-body text-sm text-on-surface break-words group-hover:text-primary transition-colors">${escapeHtml(step.title)}</span>
                    <span class="font-mono text-xs text-on-surface-variant shrink-0 whitespace-nowrap">${formatDuration(step.duration)}</span>
                  </div>
                  ${errorHtml}
                </div>
              </div>
              <div class="grid transition-[grid-template-rows] duration-300 ease-in-out" style="grid-template-rows: ${initialGrid};">
                <div class="overflow-hidden">
                  ${renderSteps(step.steps, testRef, indent + 1)}
                </div>
              </div>
            </div>
            `;
          } else {
            html += `
            <div class="flex flex-col gap-1 p-1">
              <div class="flex items-start gap-2">
                <span class="w-[18px] shrink-0"></span>
                <span class="material-symbols-outlined text-base ${statusColor} shrink-0 mt-[1px]">${statusIcon}</span>
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-body text-sm text-on-surface break-words">${escapeHtml(step.title)}</span>
                    <span class="font-mono text-xs text-on-surface-variant shrink-0 whitespace-nowrap">${formatDuration(step.duration)}</span>
                  </div>
                  ${errorHtml}
                </div>
              </div>
            </div>
            `;
          }
        });
        html += `</div>`;
        return html;
      }

      // Hook up filters and search
      document.addEventListener("DOMContentLoaded", () => {
        const filterBtns = document.querySelectorAll(".auto-filter-btn");
        filterBtns.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            filterBtns.forEach((b) => {
              b.classList.remove(
                "border-primary/40",
                "bg-primary/20",
                "text-primary",
                "active",
              );
              b.classList.add(
                "border-outline-variant/40",
                "bg-surface-container",
                "text-on-surface-variant",
              );
            });
            const target = e.currentTarget;
            target.classList.remove(
              "border-outline-variant/40",
              "bg-surface-container",
              "text-on-surface-variant",
            );
            target.classList.add(
              "border-primary/40",
              "bg-primary/20",
              "text-primary",
              "active",
            );

            currentFilter = target.getAttribute("data-filter");
            renderAutomatedTree();
          });
        });

        const searchInput = document.getElementById("automatedSearch");
        if (searchInput) {
          const debouncedRenderAutomated = typeof debounce === 'function' ? debounce(() => {
            renderAutomatedTree();
          }, 300) : null;
          
          searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            if (debouncedRenderAutomated) {
              debouncedRenderAutomated();
            } else {
              renderAutomatedTree();
            }
          });
        }

        // Event Delegation for Automated Tree
        const autoContainer = document.getElementById("automatedTreeContainer");
        if (autoContainer) {
          autoContainer.addEventListener("click", (e) => {
            // 1. Handle Suite Folders (Accordion)
            const header = e.target.closest(".suite-header");
            if (header) {
              const suite = header.getAttribute("data-suite");
              const isFile = header.getAttribute("data-is-file") === "true";
              const content = header.nextElementSibling;
              const icon = header.querySelector('.folder-icon');
              const chevron = header.querySelector('.chevron-icon');
              
              if (expandedSuites.has(suite)) {
                expandedSuites.delete(suite);
                content.style.gridTemplateRows = '0fr';
                if (!isFile) icon.textContent = 'folder';
                if (chevron) chevron.style.transform = 'rotate(-90deg)';
              } else {
                expandedSuites.add(suite);
                content.style.gridTemplateRows = '1fr';
                if (!isFile) icon.textContent = 'folder_open';
                if (chevron) chevron.style.transform = 'rotate(0deg)';
              }
              return;
            }

            // 2. Handle Test Selection
            const testItem = e.target.closest(".test-tree-item");
            if (testItem) {
              autoContainer.querySelectorAll(".test-tree-item").forEach((i) =>
                i.classList.remove("bg-primary/20", "border", "border-primary/30")
              );
              testItem.classList.add("bg-primary/20", "border", "border-primary/30");
              const testId = testItem.getAttribute("data-id");
              const test = allAutomatedTests.find((t) => t.id === testId);
              if (test) showTestDetails(test);
            }
          });
        }
      });

      // Magic Dust (Canvas Particles)
      (function () {
        const canvas = document.getElementById("magicDust");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        
        window.addEventListener("resize", () => {
          width = canvas.width = window.innerWidth;
          height = canvas.height = window.innerHeight;
        }, { passive: true });

        const particles = [];
        for (let i = 0; i < 40; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.5 + 0.3, // Size
            dx: (Math.random() - 0.5) * 0.15, // Horizontal drift
            dy: Math.random() * -0.4 - 0.1, // Float up
            color: Math.random() > 0.6 ? "rgba(251, 191, 36, 0.5)" : "rgba(167, 139, 250, 0.4)" // Gold or purple
          });
        }

        let animationFrameId;
        function animate() {
          ctx.clearRect(0, 0, width, height);
          particles.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.y < -10) p.y = height + 10;
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.fill();
          });
          animationFrameId = requestAnimationFrame(animate);
        }
        animate();
      })();
