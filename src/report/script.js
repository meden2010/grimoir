(function () {
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const tabNav = document.getElementById("tabNav");
        let tabSwitchTimeout = null;

        function showPanel(panel) {
          panel.classList.remove("hidden", "hidden-panel");
          panel.classList.add("active-panel");

          // Initialize charts/trees immediately when their tab becomes visible
          if (panel.id === "tab-automated") renderAutomatedTree();
          if (panel.id === "tab-perf") initPerfChart();

          if (typeof anime !== "undefined" && !prefersReducedMotion) {
            // Strip any residual CSS keyframe classes inside the panel so they never conflict with top-to-bottom stagger
            panel
              .querySelectorAll(".animate-fade-in-up, .tab-anim-item, .card-hover")
              .forEach((el) => {
                el.classList.remove(
                  "animate-fade-in-up",
                  "delay-100",
                  "delay-200",
                  "delay-300",
                  "delay-400",
                  "delay-500",
                  "delay-600",
                  "delay-700",
                );
                el.style.opacity = "";
                el.style.transform = "";
              });

            // Select ONLY direct first-level child blocks of the panel in strict top-to-bottom DOM order
            const topLevelBlocks = Array.from(panel.children).filter(
              (el) =>
                !el.classList.contains("hidden") &&
                el.tagName !== "SCRIPT" &&
                el.tagName !== "STYLE",
            );

            // Immediately set all top-level blocks to opacity: 0, translateY(16px) so bottom tables NEVER appear before top KPIs
            topLevelBlocks.forEach((block) => {
              block.classList.remove(
                "animate-fade-in-up",
                "delay-100",
                "delay-200",
                "delay-300",
                "delay-400",
                "delay-500",
                "delay-600",
                "delay-700",
              );
              block.style.opacity = "0";
              block.style.transform = "translateY(16px)";
            });

            anime.remove(panel);
            anime({
              targets: panel,
              opacity: [0, 1],
              duration: 750,
              easing: "easeOutCubic",
            });

            if (topLevelBlocks.length > 0) {
              anime.remove(topLevelBlocks);
              anime({
                targets: topLevelBlocks,
                opacity: [0, 1],
                translateY: [16, 0],
                duration: 750,
                delay: anime.stagger(110, { start: 0 }),
                easing: "easeOutCubic",
              });
            }
          } else {
            panel.style.opacity = "1";
            panel.style.transform = "none";
          }
        }

        function activateTab(btn, moveFocus = false) {
          if (!btn) return;

          const tab = btn.dataset.tab;
          const targetPanel = document.getElementById("tab-" + tab);
          const currentPanel = document.querySelector(
            ".tab-panel.active-panel",
          );

          if (!targetPanel || targetPanel === currentPanel) return;

          if (tabSwitchTimeout) {
            clearTimeout(tabSwitchTimeout);
            tabSwitchTimeout = null;
          }

          document.querySelectorAll("#tabNav button[role='tab']").forEach((b) => {
            b.classList.remove("tab-active");
            b.setAttribute("aria-selected", "false");
            b.setAttribute("tabindex", "-1");
          });
          btn.classList.add("tab-active");
          btn.setAttribute("aria-selected", "true");
          btn.setAttribute("tabindex", "0");
          if (moveFocus) btn.focus();

          if (currentPanel) {
            if (prefersReducedMotion) {
              currentPanel.classList.add("hidden");
              currentPanel.classList.remove("active-panel", "hidden-panel");
              showPanel(targetPanel);
              return;
            }

            // Brief 120ms cross-fade out so there is no dead waiting gap before the new tab and its cards appear
            currentPanel.classList.remove("active-panel");
            currentPanel.classList.add("hidden-panel");
            if (typeof anime !== "undefined") {
              anime.remove(currentPanel);
              anime({
                targets: currentPanel,
                opacity: 0,
                duration: 140,
                easing: "easeOutQuad",
              });
            }

            tabSwitchTimeout = setTimeout(() => {
              document.querySelectorAll(".tab-panel").forEach((p) => {
                if (p !== targetPanel) {
                  p.classList.add("hidden");
                  p.classList.remove("active-panel", "hidden-panel");
                }
              });
              showPanel(targetPanel);
            }, 120);
          } else {
            showPanel(targetPanel);
          }
        }

        if (tabNav) {
          tabNav.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-tab]");
            if (btn) activateTab(btn, false);
          });

          tabNav.addEventListener("keydown", (e) => {
            const tabs = Array.from(
              tabNav.querySelectorAll("button[role='tab']:not(.hidden)"),
            );
            const currentIndex = tabs.indexOf(document.activeElement);
            if (currentIndex === -1) return;

            let nextIndex = -1;
            if (e.key === "ArrowRight") {
              nextIndex = (currentIndex + 1) % tabs.length;
            } else if (e.key === "ArrowLeft") {
              nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            } else if (e.key === "Home") {
              nextIndex = 0;
            } else if (e.key === "End") {
              nextIndex = tabs.length - 1;
            }

            if (nextIndex !== -1) {
              e.preventDefault();
              activateTab(tabs[nextIndex], true);
            }
          });
        }

        // Header Print & Copy Summary Actions (Icon-Only Utility Buttons)
        const printBtn = document.getElementById("btnDownloadReport");
        if (printBtn) {
          printBtn.addEventListener("click", () => {
            window.print();
          });
        }

        const shareBtn = document.getElementById("btnShareReport");
        if (shareBtn) {
          shareBtn.addEventListener("click", () => {
            const healthStatus = document.querySelector("[style*='color']")?.textContent?.trim() || "REPORT";
            const summaryText = `Grimoir — Unified Test Report (${healthStatus})`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(summaryText).then(() => {
                const icon = document.getElementById("shareIcon");
                if (icon) icon.textContent = "check";
                shareBtn.classList.add("text-emerald-400", "border-emerald-400/50");
                setTimeout(() => {
                  if (icon) icon.textContent = "share";
                  shareBtn.classList.remove("text-emerald-400", "border-emerald-400/50");
                }, 2000);
              });
            }
          });
        }
      })();

      // --- Global Data Injection ---
      const PLAYWRIGHT_SUITES = __PLAYWRIGHT_SUITES_JSON__;
      const GRIMOIR_HISTORY = __HISTORY_DATA__;
      const glowPlugin = {
        id: "glow",
        beforeDatasetsDraw: function (chart) {
          const ctx = chart.ctx;
          ctx.save();
          ctx.shadowColor = "rgba(138, 79, 255, 0.42)";
          ctx.shadowBlur = 16;
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

            const li = document.createElement("button");
            li.type = "button";
            li.setAttribute("aria-pressed", String(!item.hidden));
            li.className =
              "flex items-center justify-between gap-3 cursor-pointer p-2 rounded-lg border border-outline-variant/40 bg-surface-container-low/60 hover:bg-surface-container hover:border-primary/40 transition-colors duration-500 text-left w-full";
            li.onclick = () => {
              chart.toggleDataVisibility(item.index);
              chart.update();
            };

            const leftGroup = document.createElement("div");
            leftGroup.className = "flex items-center gap-2.5";

            const box = document.createElement("span");
            // Rule 2 Semantic Status Colors: Emerald, Crimson, Ashen Slate
            const solidColors = ["#2ECC71", "#E74C3C", "#7F8C8D"];
            const color = solidColors[item.index] || "#8A4FFF";
            box.style.background = color;
            box.className = "w-3 h-3 rounded-full shrink-0";

            const label = document.createElement("span");
            label.className =
              "text-xs text-on-surface font-label-caps uppercase tracking-wider";
            label.style.textDecoration = item.hidden ? "line-through" : "";
            label.innerText = item.text;

            const countSpan = document.createElement("span");
            countSpan.className = "text-xs font-mono text-on-surface-variant tabular-nums";
            countSpan.innerText = `${val} (${pct}%)`;

            leftGroup.appendChild(box);
            leftGroup.appendChild(label);
            li.appendChild(leftGroup);
            li.appendChild(countSpan);
            ul.appendChild(li);
          });
        },
      };

      const dataLabelsPlugin = {
        id: "dataLabels",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);

          meta.data.forEach((element, index) => {
            if (element.hidden || element.circumference < Math.PI / 8) return;
            const val = chart.data.datasets[0].data[index];
            if (val === 0) return;

            const centerPoint = element.tooltipPosition();
            ctx.save();
            ctx.font = "bold 20px 'Cinzel', serif";
            ctx.fillStyle = "#F0ECE1";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(11, 12, 16, 0.9)";
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
          duration: 1400,
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#C4C9D4",
              usePointStyle: true,
              padding: 20,
              font: { size: 12, family: "Inter", weight: "500" },
            },
          },
          tooltip: {
            backgroundColor: "rgba(19, 23, 31, 0.96)",
            titleColor: "#E5C583",
            bodyColor: "#F0ECE1",
            borderColor: "rgba(229, 197, 131, 0.42)",
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
      passedGrad.addColorStop(0, "#2ECC71");
      passedGrad.addColorStop(1, "#27AE60");

      const failedGrad = ctxStatus.createLinearGradient(0, 0, 300, 300);
      failedGrad.addColorStop(0, "#E74C3C");
      failedGrad.addColorStop(1, "#C0392B");

      const skippedGrad = ctxStatus.createLinearGradient(0, 0, 300, 300);
      skippedGrad.addColorStop(0, "#95A5A6");
      skippedGrad.addColorStop(1, "#7F8C8D");

      const overviewStatusChartInstance = new Chart(ctxStatus, {
        type: "pie",
        data: {
          labels: ["Passed", "Failed", "Skipped"],
          datasets: [
            {
              data: __OVERALL_STATUS_ARRAY__,
              backgroundColor: [passedGrad, failedGrad, skippedGrad],
              borderColor: "#13171F",
              borderWidth: 2,
              hoverOffset: 14,
            },
          ],
        },
        options: {
          ...chartOptions,
          layout: { padding: 16 },
          animation: {
            duration: 1400,
            easing: "easeOutQuart",
            animateRotate: true,
            animateScale: false,
            onComplete: function (context) {
              if (context.initial) {
                context.chart.options.animation.duration = 800;
                setTimeout(() => {
                  context.chart.update("none");
                }, 50);
              }
            },
          },
          plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...chartOptions.plugins.tooltip,
              callbacks: {
                label: (context) => {
                  const dataArr = context.dataset.data || [];
                  const total = dataArr.reduce((a, b) => a + b, 0);
                  const val = Number(context.raw) || 0;
                  const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                  return ` ${context.label}: ${val} units (${pct}%)`;
                },
              },
            },
          },
          scales: {
            x: { display: false },
            y: { display: false },
          },
        },
        plugins: [glowPlugin, htmlLegendPlugin, dataLabelsPlugin],
      });

      setTimeout(() => {
        overviewStatusChartInstance.update("none");
      }, 50);

      // Overview execution duration by type chart (Sorcery Violet primary + subtle Arcane Gold highlight)
      const ctxDuration = document
        .getElementById("overviewDurationChart")
        .getContext("2d");
      const durationGrad = ctxDuration.createLinearGradient(0, 0, 0, 350);
      durationGrad.addColorStop(0, "rgba(138, 79, 255, 0.92)");
      durationGrad.addColorStop(0.75, "rgba(109, 53, 217, 0.55)");
      durationGrad.addColorStop(1, "rgba(197, 160, 89, 0.28)");

      const hoverGrad = ctxDuration.createLinearGradient(0, 0, 0, 350);
      hoverGrad.addColorStop(0, "#B388FF");
      hoverGrad.addColorStop(1, "rgba(229, 197, 131, 0.45)");

      const barLabelsPlugin = {
        id: "barLabels",
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);

          meta.data.forEach((bar, index) => {
            const val = chart.data.datasets[0].data[index];
            if (!val) return;

            ctx.save();
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const numVal = Number(val);
            const text = numVal < 60
              ? `${numVal.toFixed(1)}s`
              : `${Math.floor(numVal / 60)}m ${Math.round(numVal % 60)}s`;
            const textWidth = ctx.measureText(text).width;

            const paddingX = 8;
            const boxWidth = textWidth + paddingX * 2;
            const boxHeight = 20;
            const boxX = bar.x - boxWidth / 2;
            const boxY = Math.max(4, bar.y - boxHeight - 6);

            ctx.fillStyle = "rgba(19, 23, 31, 0.94)";
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
            } else {
              ctx.rect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.fill();
            ctx.strokeStyle = "rgba(229, 197, 131, 0.4)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = "#F0ECE1";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(text, bar.x, boxY + boxHeight / 2 + 1);
            ctx.restore();
          });
        },
      };

      const overviewDurationChartInstance = new Chart(ctxDuration, {
        type: "bar",
        data: {
          labels: __DURATION_LABELS__,
          datasets: [
            {
              label: "Duration (s)",
              data: __DURATION_DATA__,
              backgroundColor: durationGrad,
              borderRadius: 6,
              barPercentage: 0.32,
              categoryPercentage: 0.55,
              borderWidth: 1,
              borderColor: "rgba(179, 136, 255, 0.58)",
              hoverBackgroundColor: hoverGrad,
              animation: {
                delay: (context) => context.dataIndex * 180,
              },
            },
          ],
        },
        options: {
          ...chartOptions,
          layout: { padding: { top: 28 } },
          plugins: {
            ...chartOptions.plugins,
            legend: { display: false },
            tooltip: {
              ...chartOptions.plugins?.tooltip,
              callbacks: {
                label: (context) => {
                  const s = Number(context.raw);
                  const formatted = s < 60
                    ? `${s.toFixed(1)}s`
                    : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
                  return ` ${context.label}: ${formatted} (${Math.round(s * 1000).toLocaleString()} ms)`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: { color: "#C4C9D4", font: { family: "JetBrains Mono", size: 12 } },
            },
            y: {
              grid: {
                color: "rgba(138, 79, 255, 0.09)",
                drawBorder: false,
              },
              ticks: {
                color: "#C4C9D4",
                font: { family: "JetBrains Mono", size: 11 },
                callback: (val) => `${val}s`,
              },
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

      function initPerfChart() {
        if (tabCharts.perf) return;
        const ctx = document.getElementById("perfChart");
        if (!ctx) return;
        const metricDescriptions = {
          Avg: "Mean response time (http_req_duration.avg)",
          Min: "Fastest request observed (http_req_duration.min)",
          Max: "Peak tail latency (http_req_duration.max)",
          P90: "90th percentile latency (p(90))",
          P95: "95th percentile SLA benchmark (p(95))",
        };
        tabCharts.perf = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Avg", "Min", "Max", "P90", "P95"],
            datasets: [
              {
                label: "Latency (ms)",
                data: __K6_DATA_ARRAY__,
                backgroundColor: [
                  "rgba(69, 162, 158, 0.78)",
                  "rgba(46, 204, 113, 0.78)",
                  "rgba(243, 156, 18, 0.78)",
                  "rgba(229, 197, 131, 0.85)",
                  "rgba(138, 79, 255, 0.9)",
                ],
                borderColor: [
                  "#45A29E",
                  "#2ECC71",
                  "#F39C12",
                  "#E5C583",
                  "#B388FF",
                ],
                borderWidth: 1,
                borderRadius: 6,
                barPercentage: 0.45,
              },
            ],
          },
          options: {
            ...tabChartOptions,
            layout: { padding: { top: 24 } },
            plugins: {
              ...tabChartOptions.plugins,
              legend: { display: false },
              tooltip: {
                ...tabChartOptions.plugins.tooltip,
                callbacks: {
                  title: (items) => {
                    const lbl = items[0]?.label || "";
                    return metricDescriptions[lbl] || lbl;
                  },
                  label: (context) => {
                    const raw = Number(context.raw) || 0;
                    return ` Latency: ${raw.toFixed(2)} ms (${formatDuration(raw)})`;
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: "#C4C9D4", font: { family: "JetBrains Mono", size: 12 } },
              },
              y: {
                beginAtZero: true,
                grid: { color: "rgba(138, 79, 255, 0.09)" },
                ticks: {
                  color: "#C4C9D4",
                  font: { family: "JetBrains Mono", size: 11 },
                  callback: (val) => `${val}ms`,
                },
              },
            },
          },
          plugins: [barLabelsPlugin],
        });
      }

      // Collapsible sections with smooth atmospheric height animation and aria-expanded
      (function () {
        document.querySelectorAll(".collapsible-section").forEach((section) => {
          const header = section.querySelector(".collapsible-header");
          const content = section.querySelector(".collapsible-content");
          const icon = section.querySelector(".toggle-icon");
          if (!header || !content) return;

          header.addEventListener("click", () => {
            const expanded = section.getAttribute("data-expanded") === "true";
            const nextState = !expanded;
            section.setAttribute("data-expanded", String(nextState));
            header.setAttribute("aria-expanded", String(nextState));

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
                  duration: 780,
                  easing: "easeOutCubic",
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
                  duration: 820,
                  easing: "easeOutCubic",
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

      // Failures pagination, filter empty state with reset action, and accessible error modal with focus trap
      (function () {
        const rowsPerPage = 5;
        const tableBody = document.getElementById("failuresTableBody");
        const pagination = document.getElementById("failuresPagination");
        const prevBtn = document.getElementById("failuresPrev");
        const nextBtn = document.getElementById("failuresNext");
        const pageInfo = document.getElementById("failuresPageInfo");
        const searchInput = document.getElementById("failureSearch");
        const clearSearchBtn = document.getElementById("clearFailureSearch");
        const countBadge = document.getElementById("failuresCountBadge");
        const modal = document.getElementById("errorModal");
        const modalContent = document.getElementById("errorModalContent");
        const closeModal = document.getElementById("closeErrorModal");
        let lastFocusedTrigger = null;

        if (!tableBody) return;

        const allRows = Array.from(tableBody.querySelectorAll(".failure-row"));
        let filteredRows = [...allRows];
        let currentPage = 1;

        function resetFailureSearch() {
          if (searchInput) searchInput.value = "";
          if (clearSearchBtn) clearSearchBtn.classList.add("hidden");
          filteredRows = [...allRows];
          currentPage = 1;
          updatePagination();
          if (searchInput) searchInput.focus();
        }

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

          // Empty search state row with one-click Reset action (Staff Designer: Reversibility)
          let emptyFilterRow = tableBody.querySelector(".failure-empty-filter-row");
          if (allRows.length > 0 && filteredRows.length === 0) {
            if (!emptyFilterRow) {
              emptyFilterRow = document.createElement("tr");
              emptyFilterRow.className = "failure-empty-filter-row";
              emptyFilterRow.innerHTML = `<td colspan="4" class="p-gutter text-center text-on-surface-variant text-xs font-mono">
                <div class="flex flex-col items-center justify-center gap-2 py-3">
                  <span>No failures match the current filter.</span>
                  <button type="button" class="reset-failure-filter-btn px-3 py-1.5 min-h-[32px] rounded-lg bg-surface-container border border-primary/40 text-primary-container hover:bg-primary/15 active:scale-[0.98] transition-[background-color,transform] duration-500 font-label-caps uppercase text-xs">
                    Clear Filter
                  </button>
                </div>
              </td>`;
              tableBody.appendChild(emptyFilterRow);
              const resetBtn = emptyFilterRow.querySelector(".reset-failure-filter-btn");
              if (resetBtn) {
                resetBtn.addEventListener("click", resetFailureSearch);
              }
            }
            emptyFilterRow.classList.remove("hidden");
          } else if (emptyFilterRow) {
            emptyFilterRow.classList.add("hidden");
          }

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
          const applySearch = (query) => {
            filteredRows = allRows.filter((row) => {
              const text = row.textContent.toLowerCase();
              return text.includes(query);
            });
            currentPage = 1;
            updatePagination();
          };

          const debouncedFailuresSearch =
            typeof debounce === "function"
              ? debounce(applySearch, 200)
              : null;

          searchInput.addEventListener("input", (e) => {
            const rawVal = e.target.value;
            const query = rawVal.toLowerCase().trim();
            if (clearSearchBtn) {
              clearSearchBtn.classList.toggle("hidden", rawVal.length === 0);
            }
            if (debouncedFailuresSearch) {
              debouncedFailuresSearch(query);
            } else {
              applySearch(query);
            }
          });

          searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && searchInput.value.length > 0) {
              e.stopPropagation();
              resetFailureSearch();
            }
          });
        }

        if (clearSearchBtn) {
          clearSearchBtn.addEventListener("click", resetFailureSearch);
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

        function openModal(errorHtml, triggerEl) {
          if (!modalContent || !modal || !errorHtml) return;
          lastFocusedTrigger = triggerEl || document.activeElement;
          modalContent.innerHTML = errorHtml;
          modal.classList.remove("hidden");
          modal.classList.add("flex");
          void modal.offsetWidth;
          modal.classList.add("open");
          if (closeModal) closeModal.focus();
        }

        function closeModalFn() {
          if (!modal || modal.classList.contains("hidden")) return;
          modal.classList.remove("open");
          setTimeout(() => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === "function") {
              lastFocusedTrigger.focus();
            }
          }, 600);
        }

        tableBody.addEventListener("click", (e) => {
          const btn = e.target.closest(".view-error-btn");
          if (!btn) return;
          const errorHtml = btn.getAttribute("data-error-html");
          openModal(errorHtml, btn);
        });

        if (closeModal && modal) {
          closeModal.addEventListener("click", closeModalFn);
          modal.addEventListener("click", (e) => {
            if (e.target === modal) closeModalFn();
          });
        }

        // Accessibility (A11Y-PATTERNS.md): Focus Trap & Escape for active modal dialogs
        function trapModalFocus(e, activeModalEl) {
          const focusable = Array.from(
            activeModalEl.querySelectorAll(
              'button:not([disabled]):not(.hidden), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null);
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }

        document.addEventListener("keydown", (e) => {
          const allureModal = document.getElementById("allureModal");
          const isErrorModalOpen = modal && !modal.classList.contains("hidden");
          const isAllureModalOpen =
            allureModal && !allureModal.classList.contains("hidden");

          if (e.key === "Tab") {
            if (isErrorModalOpen) {
              trapModalFocus(e, modal);
            } else if (isAllureModalOpen) {
              trapModalFocus(e, allureModal);
            }
          } else if (e.key === "Escape") {
            if (isErrorModalOpen) {
              closeModalFn();
            } else if (isAllureModalOpen) {
              closeAllureModal();
            }
          }
        });
      })();

      // --- 4. Historical Trend Chart ---
      const historyRuns =
        typeof GRIMOIR_HISTORY !== "undefined"
          ? Array.isArray(GRIMOIR_HISTORY)
            ? GRIMOIR_HISTORY
            : GRIMOIR_HISTORY.runs || []
          : [];
      if (historyRuns.length >= 0) {
        const trendContainer = document.getElementById("trendChartContainer");
        if (trendContainer) {
          if (historyRuns.length <= 1) {
            trendContainer.innerHTML = `<div class="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant p-4 text-center">
              <span class="material-symbols-outlined text-4xl mb-2 text-primary/50" aria-hidden="true">show_chart</span>
              <p class="text-sm font-display uppercase tracking-wider">Awaiting Historical Runs</p>
              <p class="text-xs text-outline mt-1">Execute additional test runs to illuminate historical pass/fail trends.</p>
            </div>`;
          } else {
            trendContainer.innerHTML =
              '<canvas id="overviewTrendChart" aria-label="Line chart of historical test runs" role="img"></canvas>';
            const ctxTrend = document
              .getElementById("overviewTrendChart")
              .getContext("2d");

            const labels = historyRuns.map((h, index) => {
              const d = new Date(h.date);
              return (
                "Run " +
                (index + 1) +
                " (" +
                d.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }) +
                ")"
              );
            });
            const passedData = historyRuns.map((h) => h.passed);
            const failedData = historyRuns.map((h) => h.failed);

            new Chart(ctxTrend, {
              type: "line",
              data: {
                labels: labels,
                datasets: [
                  {
                    label: "Passed",
                    data: passedData,
                    borderColor: "#2ECC71",
                    backgroundColor: "rgba(46, 204, 113, 0.12)",
                    pointBackgroundColor: "#2ECC71",
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                  },
                  {
                    label: "Failed",
                    data: failedData,
                    borderColor: "#E74C3C",
                    backgroundColor: "rgba(231, 76, 60, 0.12)",
                    pointBackgroundColor: "#E74C3C",
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.35,
                  },
                ],
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    labels: {
                      color: "#C4C9D4",
                      usePointStyle: true,
                      font: { family: "'Inter', sans-serif", size: 12 },
                    },
                  },
                  tooltip: {
                    ...chartOptions.plugins.tooltip,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: "rgba(138, 79, 255, 0.09)" },
                    ticks: { color: "#C4C9D4", precision: 0, font: { family: "JetBrains Mono", size: 11 } },
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: "#C4C9D4",
                      maxRotation: 0,
                      minRotation: 0,
                      font: { family: "JetBrains Mono", size: 11 },
                    },
                  },
                },
              },
              plugins: [glowPlugin],
            });
          }
        }
      }

      // Counter animation for KPI numbers using anime.js with slower atmospheric duration
      (function () {
        const counters = document.querySelectorAll(".counter");
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        function animateCounterManual(counter, target, isFloat, isDuration) {
          if (prefersReducedMotion) {
            counter.textContent = isDuration
              ? formatDuration(target)
              : isFloat
                ? target.toFixed(2)
                : Math.round(target).toString();
            return;
          }
          const duration = 1500;
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

          if (prefersReducedMotion) {
            animateCounterManual(counter, target, isFloat, isDuration);
            return;
          }

          if (typeof anime !== "undefined") {
            const animObj = { value: 0 };
            anime({
              targets: animObj,
              value: target,
              round: isFloat ? 100 : 1,
              duration: 1550,
              easing: "easeOutQuart",
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

        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) {
          gaugeArc.setAttribute("stroke-dashoffset", targetOffset.toString());
          return;
        }

        function animateGaugeManual() {
          const duration = 1650;
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
            easing: "easeOutQuart",
            duration: 1650,
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
          progressBar.style.height = `${Math.min(100, Math.max(8, ratio * 100))}%`;
        }

        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);
        updateProgress();
      })();

      // Title character animation (Preserves accessible text for screen readers)
      (function () {
        const title = document.getElementById("grimoireTitle");
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!title || typeof anime === "undefined" || prefersReducedMotion) return;

        const text = title.textContent.trim();
        title.setAttribute("aria-label", text);
        title.innerHTML = text
          .split("")
          .map(
            (char) =>
              `<span class="inline-block" aria-hidden="true" style="opacity:0">${char === " " ? "&nbsp;" : char}</span>`,
          )
          .join("");

        anime({
          targets: "#grimoireTitle span",
          translateY: [16, 0],
          opacity: [0, 1],
          delay: anime.stagger(75, { start: 120 }),
          easing: "easeOutQuart",
          duration: 900,
        });
      })();

      // anime.js stagger animations
      (function () {
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (typeof anime === "undefined" || prefersReducedMotion) return;

        anime({
          targets: ".failure-row",
          translateX: [-14, 0],
          opacity: [0, 1],
          delay: anime.stagger(75, { start: 450 }),
          easing: "easeOutQuart",
          duration: 750,
        });

        anime({
          targets: ".perf-metric-row",
          translateX: [14, 0],
          opacity: [0, 1],
          delay: anime.stagger(70, { start: 350 }),
          easing: "easeOutQuart",
          duration: 720,
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
        const num = Math.round(Number(ms));
        if (num >= 60000) {
          const minutes = Math.floor(num / 60000);
          const seconds = Math.floor((num % 60000) / 1000);
          return `${minutes}.${seconds.toString().padStart(2, "0")}m`;
        }
        if (num >= 1000) {
          const seconds = (num / 1000).toFixed(1);
          return parseFloat(seconds) + "s";
        }
        return num + "ms";
      }

      let allAutomatedTests = [];
      const extractedTags = new Set();
      let currentFilter = "all";
      let currentSearch = "";
      const expandedSuites = new Set();
      let selectedTestId = null;

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
        if (
          low === "unexpected" ||
          low === "failed" ||
          low === "timedout" ||
          low === "interrupted"
        )
          return "failed";
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
                  const overallStatus =
                    spec.ok === false
                      ? "failed"
                      : normalizeStatusStr(lastResult.status);
                  const matchTags = spec.title.match(/@\w+/g);
                  if (matchTags) {
                    matchTags.forEach((t) => extractedTags.add(t));
                  }

                  const testKey = `${path} > ${spec.title}`;

                  allAutomatedTests.push({
                    id: "test-" + (allAutomatedTests.length + 1),
                    testKey: testKey,
                    suitePath: path,
                    name: spec.title,
                    projectName: test.projectName || "chromium",
                    status: overallStatus,
                    isFlaky:
                      test.status === "flaky" ||
                      (results.length > 1 &&
                        results.some(
                          (r) => normalizeStatusStr(r.status) === "failed",
                        ) &&
                        overallStatus === "passed"),
                    duration: results.reduce(
                      (acc, r) => acc + (r.duration || 0),
                      0,
                    ),
                    error:
                      lastResult.error?.message ||
                      lastResult.errors?.[0]?.message ||
                      null,
                    errorObj:
                      lastResult.error || lastResult.errors?.[0] || null,
                    steps: lastResult.steps || [],
                    attachments: lastResult.attachments || [],
                    results: results,
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

        let html = "";
        Array.from(extractedTags)
          .sort()
          .forEach((tag) => {
            const isActive = currentSearch.includes(tag);
            const activeClass = isActive
              ? "bg-secondary/15 text-secondary-container border-secondary/55 shadow-[0_0_10px_rgba(229,197,131,0.16)]"
              : "bg-surface-container border-secondary/25 text-on-surface-variant hover:text-secondary-container hover:border-secondary/50";
            html += `<button type="button" aria-pressed="${isActive}" class="tag-chip text-xs font-mono px-2.5 py-0.5 rounded-full border active:scale-[0.98] transition-[color,background-color,border-color,transform] ${activeClass}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
          });
        container.innerHTML = html;

        container.querySelectorAll(".tag-chip").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const tag = e.currentTarget.getAttribute("data-tag");
            const searchInput = document.getElementById("automatedSearch");
            const clearBtn = document.getElementById("clearAutomatedSearch");

            if (currentSearch.includes(tag)) {
              currentSearch = currentSearch
                .replace(tag, "")
                .replace(/\s+/g, " ")
                .trim();
            } else {
              currentSearch = (currentSearch + " " + tag).trim();
            }

            if (searchInput) searchInput.value = currentSearch;
            if (clearBtn) clearBtn.classList.toggle("hidden", currentSearch.length === 0);
            renderAutomatedTree();
          });
        });
      }

      function resetAutomatedFilters() {
        currentSearch = "";
        currentFilter = "all";
        const searchInput = document.getElementById("automatedSearch");
        const clearBtn = document.getElementById("clearAutomatedSearch");
        if (searchInput) searchInput.value = "";
        if (clearBtn) clearBtn.classList.add("hidden");
        document.querySelectorAll(".auto-filter-btn").forEach((b) => {
          const isAll = b.getAttribute("data-filter") === "all";
          b.classList.toggle("border-primary/40", isAll);
          b.classList.toggle("bg-primary/20", isAll);
          b.classList.toggle("text-primary", isAll);
          b.classList.toggle("active", isAll);
          b.classList.toggle("border-outline-variant", !isAll);
          b.classList.toggle("bg-surface-container", !isAll);
          b.classList.toggle("text-on-surface-variant", !isAll);
          b.setAttribute("aria-pressed", String(isAll));
        });
        renderAutomatedTree();
      }

      function renderAutomatedTree() {
        if (allAutomatedTests.length === 0 && PLAYWRIGHT_SUITES) {
          buildFlatTestList(PLAYWRIGHT_SUITES);
          // Expand all top-level suites by default on initial load for better UX
          allAutomatedTests.forEach((t) => {
            const firstPart = t.suitePath.split(" > ")[0]?.split("/")[0]?.trim();
            if (firstPart) expandedSuites.add(firstPart);
          });
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

        const visibleCountEl = document.getElementById("automatedVisibleCount");
        if (visibleCountEl) {
          if (filtered.length === allAutomatedTests.length) {
            visibleCountEl.textContent = `Showing all ${allAutomatedTests.length} tests`;
          } else {
            visibleCountEl.textContent = `Showing ${filtered.length} of ${allAutomatedTests.length} tests`;
          }
        }

        const chartBase = allAutomatedTests.filter((t) => {
          if (
            currentSearch &&
            !t.name.toLowerCase().includes(currentSearch.toLowerCase()) &&
            !t.suitePath.toLowerCase().includes(currentSearch.toLowerCase())
          )
            return false;
          return true;
        });

        const totalChart = chartBase.length;
        const passedChart = chartBase.filter(
          (t) => t.status === "passed",
        ).length;
        const failedChart = chartBase.filter(
          (t) => t.status === "failed",
        ).length;
        const skippedChart = chartBase.filter(
          (t) => t.status === "skipped",
        ).length;

        const passRate =
          totalChart > 0 ? Math.round((passedChart / totalChart) * 100) : 0;

        const pathSkipped = document.getElementById("donutSkipped");
        const pathFailed = document.getElementById("donutFailed");
        const pathPassed = document.getElementById("donutPassed");
        const text = document.getElementById("sidebarPassRateText");

        if (text) text.textContent = `${passRate}%`;

        if (pathSkipped && pathFailed && pathPassed && totalChart > 0) {
          const skipPct = (skippedChart / totalChart) * 100;
          const failPct = (failedChart / totalChart) * 100;
          const passPct = (passedChart / totalChart) * 100;

          pathSkipped.setAttribute("stroke-dasharray", `${skipPct}, 100`);
          pathSkipped.setAttribute("stroke-dashoffset", `0`);

          pathFailed.setAttribute("stroke-dasharray", `${failPct}, 100`);
          pathFailed.setAttribute("stroke-dashoffset", `-${skipPct}`);

          pathPassed.setAttribute("stroke-dasharray", `${passPct}, 100`);
          pathPassed.setAttribute(
            "stroke-dashoffset",
            `-${skipPct + failPct}`,
          );
        } else if (pathSkipped && pathFailed && pathPassed) {
          pathSkipped.setAttribute("stroke-dasharray", `0, 100`);
          pathFailed.setAttribute("stroke-dasharray", `0, 100`);
          pathPassed.setAttribute("stroke-dasharray", `0, 100`);
        }

        const treeRoot = {};
        filtered.forEach((t) => {
          let parts = [];
          let pathStr = t.suitePath;
          const projMatch = pathStr.match(/^\[(.*?)\]\s*(.*)$/);
          if (projMatch) {
            pathStr = projMatch[2];
          }

          const arrowParts = pathStr.split(" > ");
          arrowParts.forEach((ap) => {
            const slashParts = ap.split("/");
            parts = parts.concat(slashParts);
          });
          parts = parts.map((p) => p.trim()).filter(Boolean);

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
          container.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-3 text-center p-6 text-on-surface-variant text-xs font-mono">
              <span class="material-symbols-outlined text-3xl text-outline" aria-hidden="true">filter_alt_off</span>
              <span>No automated tests match the current filter.</span>
              <button type="button" id="btnResetAutoFilters" class="px-3 py-1.5 min-h-[32px] rounded-lg bg-surface-container border border-primary/40 text-primary hover:bg-primary/15 active:scale-[0.98] transition-[background-color,transform] font-label-caps uppercase text-xs">
                Reset Filters
              </button>
            </div>`;
          const resetBtn = document.getElementById("btnResetAutoFilters");
          if (resetBtn) {
            resetBtn.addEventListener("click", resetAutomatedFilters);
          }
          return;
        }

        function renderTreeNodes(node, parentPath = "", indent = 0) {
          let html = "";
          const keys = Object.keys(node).sort();
          keys.forEach((key) => {
            const childNode = node[key];
            const currentPath = parentPath ? `${parentPath}/${key}` : key;
            const isFile =
              /\.(ts|js|mjs|tsx|jsx|php|py|rb|java|cs|go)$/i.test(key) ||
              key.toLowerCase().includes(".spec.") ||
              key.toLowerCase().includes(".test.");

            const isCollapsed = !expandedSuites.has(currentPath);
            const gridRows = isCollapsed ? "0fr" : "1fr";
            const chevronRotation = isCollapsed ? "-90deg" : "0deg";
            const iconName = isFile
              ? "description"
              : isCollapsed
                ? "folder"
                : "folder_open";
            const iconColor = isFile ? "text-tertiary" : "text-secondary-container";
            const marginClass = indent > 0 ? "mt-1.5 pl-3 border-l border-outline-variant/30" : "";
            const hideChevron =
              isFile &&
              Object.keys(childNode._children).length === 0 &&
              childNode._tests.length === 0
                ? "invisible"
                : "";

            html += `
            <div class="${marginClass} mb-2" role="treeitem" aria-expanded="${!isCollapsed}">
              <button type="button" class="suite-header w-full text-left font-sans text-sm font-medium text-on-surface mb-1 flex items-center gap-1.5 cursor-pointer hover:text-primary hover:bg-surface-container rounded-lg px-2 py-1.5 transition-colors duration-150 select-none" data-suite="${escapeHtml(currentPath)}" data-is-file="${isFile}">
                <span class="material-symbols-outlined text-base chevron-icon transition-transform ${hideChevron}" style="transform: rotate(${chevronRotation}); transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);" aria-hidden="true">expand_more</span>
                <span class="material-symbols-outlined text-base folder-icon ${iconColor} transition-colors duration-150" aria-hidden="true">${iconName}</span>
                <span class="font-medium truncate flex-1" title="${escapeHtml(key)}">${escapeHtml(key)}</span>
                <span class="font-mono text-xs text-outline">${childNode._tests.length || ""}</span>
              </button>
              <div class="grid transition-[grid-template-rows] suite-content" style="grid-template-rows: ${gridRows}; transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);">
                <div class="overflow-hidden">
            `;

            if (Object.keys(childNode._children).length > 0) {
              html += renderTreeNodes(
                childNode._children,
                currentPath,
                indent + 1,
              );
            }

            if (childNode._tests.length > 0) {
              html += `<div class="flex flex-col gap-1 mt-1 pl-2">`;
              childNode._tests.forEach((test) => {
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
                const isSelected = selectedTestId === test.id;
                const activeClasses = isSelected
                  ? "bg-primary/20 border border-primary/40"
                  : "border border-transparent";

                const retriesBadge =
                  test.results && test.results.length > 1
                    ? `<span class="bg-amber-500/15 text-amber-400 text-xs px-1.5 py-0.5 rounded font-mono border border-amber-500/30 whitespace-nowrap ml-2" title="${test.results.length} attempts total"><span class="material-symbols-outlined text-xs align-middle mr-0.5" aria-hidden="true">replay</span>${test.results.length}</span>`
                    : "";

                html += `
                  <button type="button" class="test-tree-item w-full text-left flex items-center gap-2.5 p-2 rounded-lg cursor-pointer ${bgHover} ${activeClasses} transition-colors duration-150" data-id="${test.id}">
                    <span class="material-symbols-outlined text-base ${statusColor} shrink-0" aria-hidden="true">${statusIcon}</span>
                    <span class="font-sans font-normal text-sm text-on-surface truncate flex-1 flex items-center justify-between" title="${escapeHtml(test.name)}">
                      <span class="truncate">${escapeHtml(test.name)}</span>
                      ${retriesBadge}
                    </span>
                    <span class="font-mono text-xs text-outline tabular-nums shrink-0">${formatDuration(test.duration)}</span>
                  </button>
                `;
              });
              html += `</div>`;
            }

            html += `</div></div></div>`;
          });
          return html;
        }

        container.innerHTML = renderTreeNodes(treeRoot);

        // Auto-select first test if none is selected so right pane isn't an empty dead-end
        if (!selectedTestId && filtered.length > 0) {
          const firstFailed = filtered.find((t) => t.status === "failed") || filtered[0];
          selectedTestId = firstFailed.id;
          showTestDetails(firstFailed);
          const activeBtn = container.querySelector(`.test-tree-item[data-id="${selectedTestId}"]`);
          if (activeBtn) {
            activeBtn.classList.add("bg-primary/20", "border-primary/40");
            activeBtn.classList.remove("border-transparent");
          }
        }
      }

      function showTestDetails(test) {
        try {
          selectedTestId = test.id;
          document
            .getElementById("btnOpenAllure")
            .setAttribute("onclick", `openAllureModal('${test.id}')`);

          const emptyState = document.getElementById("automatedEmptyState");
          if (emptyState) {
            emptyState.classList.add("opacity-0", "pointer-events-none", "hidden");
            emptyState.classList.remove("z-10");
          }

          const contentState = document.getElementById("automatedContentState");
          if (contentState) {
            contentState.classList.remove(
              "opacity-0",
              "pointer-events-none",
              "hidden",
              "animate-fade-in-up",
            );
            const reducedMotion =
              window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (typeof anime !== "undefined" && !reducedMotion) {
              anime.remove(contentState);
              anime({
                targets: contentState,
                opacity: [0, 1],
                translateY: [6, 0],
                duration: 180,
                easing: "easeOutQuad",
              });
            } else {
              contentState.style.opacity = "1";
              contentState.style.transform = "none";
            }
          }

          document.getElementById("detailTestName").textContent =
            test.name || "Unknown Test";
          document.getElementById("detailSuiteText").textContent =
            test.suitePath || "Unknown Suite";
          document.getElementById("detailDurationText").textContent =
            formatDuration(test.duration);

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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border";
          dot.className = "w-1.5 h-1.5 rounded-full";
          if (test.status === "passed") {
            badge.classList.add(
              "bg-emerald-400/10",
              "text-emerald-400",
              "border-emerald-400/30",
            );
            dot.classList.add("bg-emerald-400");
          } else if (test.status === "failed") {
            badge.classList.add(
              "bg-error/10",
              "text-error",
              "border-error/30",
            );
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
          const lastResult =
            results.length > 0 ? results[results.length - 1] : {};

          const stepsToRender = test.steps || lastResult.steps || [];
          const attachmentsToRender =
            test.attachments || lastResult.attachments || [];

          // --- Execution Tab (Include Top-Level Diagnostic Error if Failed) ---
          const mainErrorObj =
            test.errorObj ||
            lastResult.error ||
            (lastResult.errors && lastResult.errors.length > 0
              ? lastResult.errors[0]
              : null);
          const mainErrorMsg =
            test.error ||
            mainErrorObj?.message ||
            (typeof lastResult.error === "string" ? lastResult.error : null) ||
            (typeof mainErrorObj === "string" ? mainErrorObj : null);

          if (mainErrorMsg) {
            execHtml += `
              <div class="bg-surface-container-low border border-error/40 rounded-lg overflow-hidden mb-3">
                <div class="bg-error/10 border-b border-error/20 px-3 py-2 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-error font-label-caps text-xs uppercase font-bold">
                    <span class="material-symbols-outlined text-base" aria-hidden="true">error</span>
                    <span>Failure Diagnostic</span>
                  </div>
                  ${
                    mainErrorObj?.location
                      ? `<span class="font-mono text-xs text-on-surface-variant">${escapeHtml(mainErrorObj.location.file)}:${mainErrorObj.location.line}:${mainErrorObj.location.column}</span>`
                      : ""
                  }
                </div>
                <div class="p-3">
                  <pre class="font-mono text-xs text-error whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(mainErrorMsg)}</pre>
                </div>
                ${
                  mainErrorObj?.snippet
                    ? `<div class="p-3 bg-surface border-t border-outline-variant/40">
                        <div class="text-xs font-label-caps text-on-surface-variant uppercase mb-1.5 flex items-center gap-1.5">
                          <span class="material-symbols-outlined text-sm" aria-hidden="true">code</span>
                          <span>Source Snippet</span>
                        </div>
                        <pre class="font-mono text-xs text-on-surface-variant whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(mainErrorObj.snippet)}</pre>
                      </div>`
                    : ""
                }
              </div>
            `;
          }

          if (stepsToRender && stepsToRender.length > 0) {
            execHtml += `<div class="font-label-caps text-xs text-on-surface-variant uppercase mt-3 mb-2 flex items-center justify-between">
              <span>Execution Steps</span>
              <span class="font-mono text-xs text-outline tabular-nums">${stepsToRender.length} recorded</span>
            </div>`;
            execHtml += renderSteps(stepsToRender, test);
          } else if (!mainErrorMsg) {
            execHtml += `
              <div class="bg-surface-container-low/50 border border-outline-variant/40 rounded-lg p-4 flex items-center gap-3 text-on-surface-variant text-sm">
                <span class="material-symbols-outlined text-emerald-400 text-xl" aria-hidden="true">verified</span>
                <div>
                  <p class="font-semibold text-on-surface">Assertion completed in ${formatDuration(test.duration)}</p>
                  <p class="text-xs text-outline mt-0.5">No granular step instrumentation recorded for this spec.</p>
                </div>
              </div>`;
          } else {
            execHtml += `
              <div class="font-label-caps text-xs text-on-surface-variant uppercase mt-3 mb-2">Execution Steps</div>
              <div class="bg-surface-container-low/50 border border-outline-variant/40 rounded-lg p-3 text-xs text-on-surface-variant italic">
                No granular step instrumentation recorded for this spec.
              </div>`;
          }

          // --- Artifacts Tab ---
          if (attachmentsToRender && attachmentsToRender.length > 0) {
            tabBtnArtifacts.classList.remove("hidden");
            artiHtml += `<div class="font-label-caps text-xs text-on-surface-variant uppercase mt-1 mb-2">Attachments</div>`;
            artiHtml += `<div class="flex flex-col gap-3">`;
            attachmentsToRender.forEach((att) => {
              artiHtml += `
              <div class="flex flex-col gap-1 bg-surface-container-low/50 rounded-lg border border-outline-variant overflow-hidden group">
                <button type="button" class="w-full text-left flex items-center gap-2 cursor-pointer hover:bg-surface-container p-2.5 transition-colors select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.att-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                  <span class="material-symbols-outlined text-base att-chevron transition-transform text-on-surface-variant shrink-0" style="transform: rotate(-90deg); transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);" aria-hidden="true">expand_more</span>
                  <span class="material-symbols-outlined text-base text-primary" aria-hidden="true">attachment</span>
                  <span class="font-body text-sm font-semibold text-on-surface group-hover:text-primary transition-colors flex-1">${escapeHtml(att.name)}</span>
                </button>
                <div class="grid transition-[grid-template-rows]" style="grid-template-rows: 0fr; transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);">
                  <div class="overflow-hidden">
                    <div class="p-3 border-t border-outline-variant/40 bg-surface-container-lowest">`;

              if (
                (att.name && att.name.toLowerCase().includes("trace")) ||
                (att.path && att.path.endsWith(".zip"))
              ) {
                artiHtml += `
                  <div class="bg-surface-container border border-primary/30 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="material-symbols-outlined text-primary text-lg" aria-hidden="true">troubleshoot</span>
                      <h4 class="font-bold text-on-surface text-sm">Playwright Trace Viewer</h4>
                    </div>
                    <p class="text-xs text-on-surface-variant mb-4 leading-relaxed">
                      Explore a full timeline of your test execution including DOM snapshots, network requests, and console logs.
                    </p>
                    <div class="flex flex-col gap-3">
                      <div class="bg-surface-container-lowest border border-outline-variant/40 rounded p-3">
                        <div class="text-xs font-bold text-on-surface mb-2 font-label-caps uppercase">Option 1: View in Browser</div>
                        <div class="flex items-center justify-between gap-2">
                          <span class="text-xs text-on-surface-variant flex-1 leading-relaxed">Download the trace and drop it into <a href="https://trace.playwright.dev" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">trace.playwright.dev</a></span>
                          ${
                            att.path
                              ? `<a href="${escapeHtml(att.path)}" download class="shrink-0 flex items-center gap-1.5 bg-primary/15 text-primary border border-primary/30 px-3 py-1.5 rounded text-xs font-bold hover:bg-primary hover:text-on-primary transition-colors">
                            <span class="material-symbols-outlined text-sm" aria-hidden="true">download</span> Download
                          </a>`
                              : `<span class="text-xs text-error">File path missing</span>`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              } else if (
                att.contentType &&
                att.contentType.startsWith("image/")
              ) {
                artiHtml += `<img src="${att.path || "data:image/png;base64," + (att.body || "")}" alt="${escapeHtml(att.name)}" class="rounded max-w-full border border-outline-variant shadow-sm" />`;
              } else if (
                att.contentType &&
                att.contentType.startsWith("video/")
              ) {
                artiHtml += `<video controls src="${att.path || ""}" class="rounded max-w-full border border-outline-variant shadow-sm"></video>`;
              } else {
                artiHtml += `<a href="${att.path || "#"}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline text-sm flex items-center gap-1"><span class="material-symbols-outlined text-base" aria-hidden="true">download</span> Download File</a>`;
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
            artiHtml = `<div class="text-outline text-sm italic mt-2">No attachments recorded.</div>`;
          }

          // --- Executions History Tab (No side-tab border-l-4) ---
          if (results.length > 0) {
            tabBtnExecutions.classList.remove("hidden");
            historyHtml += `<div class="font-label-caps text-xs text-on-surface-variant uppercase mt-1 mb-2">Attempt History</div>`;
            historyHtml += `<div class="flex flex-col gap-3">`;

            results.forEach((r, idx) => {
              const isPassed = normalizeStatusStr(r.status) === "passed";
              const rStatusColor = isPassed ? "emerald-400" : "error";
              const rIcon = isPassed ? "check_circle" : "cancel";
              const rBorder = isPassed
                ? "border-emerald-500/30"
                : "border-error/40";
              const rErrorObj =
                r.error ||
                (r.errors && r.errors.length > 0 ? r.errors[0] : null);
              const rErrorMsg =
                rErrorObj?.message ||
                (typeof r.error === "string" ? r.error : null) ||
                (typeof rErrorObj === "string" ? rErrorObj : null);
              const startTime = r.startTime
                ? new Date(r.startTime).toLocaleString()
                : "Execution Run";

              const hasError = !!rErrorMsg;
              const gridRows = hasError ? "1fr" : "0fr";
              const chevronRot = hasError ? "0deg" : "-90deg";

              historyHtml += `
              <div class="relative overflow-hidden bg-surface-container-low/60 rounded-lg border ${rBorder} shadow-sm group">
                <div class="relative flex flex-col">
                  <button type="button" class="w-full text-left flex items-start justify-between p-3.5 cursor-pointer hover:bg-surface-container transition-colors select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.att-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-lg att-chevron transition-transform text-on-surface-variant shrink-0" style="transform: rotate(${chevronRot}); transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);" aria-hidden="true">expand_more</span>
                      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-${rStatusColor}/10 text-${rStatusColor}">
                        <span class="material-symbols-outlined text-base" aria-hidden="true">${rIcon}</span>
                      </div>
                      <div>
                        <div class="text-sm font-bold text-on-surface">Attempt #${idx + 1}</div>
                        <div class="text-xs font-label-caps text-${rStatusColor} font-bold uppercase tracking-wider mt-0.5">${escapeHtml(r.status)}</div>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 text-xs text-on-surface-variant font-mono">
                      <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs" aria-hidden="true">schedule</span> ${escapeHtml(startTime)}</span>
                      <span class="flex items-center gap-1 tabular-nums"><span class="material-symbols-outlined text-xs" aria-hidden="true">timer</span> ${formatDuration(r.duration || 0)}</span>
                    </div>
                  </button>
                  <div class="grid transition-[grid-template-rows]" style="grid-template-rows: ${gridRows}; transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);">
                    <div class="overflow-hidden">
                      <div class="px-4 pb-4 pt-1">
              `;
              if (hasError) {
                historyHtml += `<div class="bg-surface border border-error/30 rounded-lg overflow-hidden">`;
                if (rErrorObj?.location) {
                  const loc = rErrorObj.location;
                  historyHtml += `
                    <div class="bg-surface-container-lowest border-b border-error/20 px-3 py-2 flex items-center gap-2 text-on-surface-variant font-mono text-xs">
                      <span class="material-symbols-outlined text-sm" aria-hidden="true">description</span>
                      <span>${escapeHtml(loc.file)}:${loc.line}:${loc.column}</span>
                    </div>
                  `;
                }
                historyHtml += `
                  <div class="p-3 ${rErrorObj?.snippet ? "border-b border-error/20" : ""}">
                    <pre class="font-mono text-xs text-error whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(rErrorMsg)}</pre>
                  </div>
                `;
                if (rErrorObj?.snippet) {
                  historyHtml += `
                    <div class="p-3 bg-surface-container-lowest">
                      <pre class="font-mono text-xs text-on-surface-variant whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(rErrorObj.snippet)}</pre>
                    </div>
                  `;
                }
                historyHtml += `</div>`;
              } else {
                historyHtml += `<div class="text-xs text-on-surface-variant italic">Execution attempt passed without errors.</div>`;
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
          document.getElementById("detailExecutionsTabBody").innerHTML =
            historyHtml;
          document.getElementById("detailArtifactsBody").innerHTML = artiHtml;
          switchDetailTab("execution");
        } catch (e) {
          console.error("Error displaying test details:", e);
        }
      }

      function closeAllureModal() {
        const modal = document.getElementById("allureModal");
        if (modal) {
          modal.classList.remove("open");
          const content = modal.querySelector(".modal-content");
          if (content) {
            content.style.transform = "scale(0.95)";
            content.style.opacity = "0";
          }
          if (window.allureCloseTimeout)
            clearTimeout(window.allureCloseTimeout);
          window.allureCloseTimeout = setTimeout(() => {
            modal.classList.add("hidden");
            modal.classList.remove("flex");
            const openBtn = document.getElementById("btnOpenAllure");
            if (openBtn) openBtn.focus();
          }, 600);
        }
      }

      function openAllureModal(testId) {
        if (window.allureCloseTimeout) clearTimeout(window.allureCloseTimeout);

        const testIndex = allAutomatedTests.findIndex((t) => t.id === testId);
        if (testIndex === -1) return;
        const test = allAutomatedTests[testIndex];

        const prevBtn = document.getElementById("allureModalPrevBtn");
        const nextBtn = document.getElementById("allureModalNextBtn");
        document.getElementById("allureModalCounter").textContent =
          `${testIndex + 1} / ${allAutomatedTests.length}`;

        if (testIndex > 0) {
          prevBtn.disabled = false;
          prevBtn.onclick = () =>
            openAllureModal(allAutomatedTests[testIndex - 1].id);
        } else {
          prevBtn.disabled = true;
          prevBtn.onclick = null;
        }

        if (testIndex < allAutomatedTests.length - 1) {
          nextBtn.disabled = false;
          nextBtn.onclick = () =>
            openAllureModal(allAutomatedTests[testIndex + 1].id);
        } else {
          nextBtn.disabled = true;
          nextBtn.onclick = null;
        }

        document.getElementById("allureTestName").textContent =
          test.name || "Unknown Test";
        document.getElementById("allureDurationText").textContent =
          formatDuration(test.duration);
        document.getElementById("allureProjectText").textContent =
          test.projectName || "chromium";
        document.getElementById("allureSuiteText").textContent =
          test.suitePath || "Unknown Suite";

        const copySuiteBtn = document.getElementById("copyAllureSuiteBtn");
        if (copySuiteBtn) {
          copySuiteBtn.onclick = () => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(test.suitePath || "");
            }
          };
        }

        // Consistent English Status Badges
        const statusBadge = document.getElementById("allureStatusBadge");
        const statusIcon = document.getElementById("allureStatusIcon");
        const statusText = document.getElementById("allureStatusText");

        statusBadge.className =
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border ";
        if (test.status === "passed") {
          statusBadge.className +=
            "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
          statusIcon.textContent = "check_circle";
          statusText.textContent = "PASSED";
        } else if (test.status === "failed") {
          statusBadge.className += "bg-error/15 text-error border-error/30";
          statusIcon.textContent = "cancel";
          statusText.textContent = "FAILED";
        } else {
          statusBadge.className +=
            "bg-surface-container text-outline border-outline-variant";
          statusIcon.textContent = "do_not_disturb_on";
          statusText.textContent = "SKIPPED";
        }

        // Tags Grid
        let tagsGridHtml = "";
        const allTags = [
          { label: "language", value: "TypeScript / JS" },
          { label: "framework", value: "Playwright" },
          { label: "suite", value: test.suitePath },
        ];

        const explicitTags = (test.name || "").match(/@\w+/g) || [];
        explicitTags.forEach((t) => allTags.push({ label: "tag", value: t }));

        const hiddenTags = allTags.slice(4);

        function renderTag(t, hidden = false) {
          return `
          <div class="grid grid-cols-[100px_1fr] items-center gap-y-2 ${hidden ? "hidden-tag hidden" : ""}">
            <span class="text-on-surface-variant font-mono">${escapeHtml(t.label)}</span>
            <span class="inline-flex"><span class="bg-surface-container text-on-surface border border-outline-variant px-2 py-0.5 rounded text-xs font-mono truncate max-w-[260px]" title="${escapeHtml(t.value)}">${escapeHtml(t.value)}</span></span>
          </div>`;
        }

        allTags.forEach((t, index) => {
          tagsGridHtml += renderTag(t, index >= 4);
        });

        document.getElementById("allureTagsGrid").innerHTML = tagsGridHtml;
        document.getElementById("allureTagsCountBadge").textContent =
          allTags.length.toString();

        const showMoreBtn = document.getElementById("allureTagsShowMoreBtn");
        if (hiddenTags.length > 0) {
          showMoreBtn.classList.remove("hidden");
          showMoreBtn.textContent = `Show more (+${hiddenTags.length})`;
          showMoreBtn.onclick = function () {
            const isShowingAll = this.textContent.includes("Show less");
            document
              .querySelectorAll(".hidden-tag")
              .forEach((el) => el.classList.toggle("hidden", isShowingAll));
            this.textContent = isShowingAll
              ? `Show more (+${hiddenTags.length})`
              : `Show less`;
          };
        } else {
          showMoreBtn.classList.add("hidden");
        }

        let stepCount = 0;
        function renderAllureSteps(steps, indent = 0) {
          if (!steps || steps.length === 0) return "";
          let html = "";
          steps.forEach((step) => {
            stepCount++;
            const isFailed = step.error;
            const statusIcon = isFailed ? "cancel" : "check_circle";
            const statusColor = isFailed ? "text-error" : "text-emerald-400";
            const hasChildren = step.steps && step.steps.length > 0;
            const hasChildWithError =
              hasChildren && step.steps.some((s) => s.error);
            const shouldShowErrorBox =
              isFailed && step.error && !hasChildWithError;

            const paddingLeft = indent * 20;

            let stepErrorHtml = "";
            if (shouldShowErrorBox) {
              const errMsg =
                typeof step.error === "string"
                  ? step.error
                  : step.error.message;
              stepErrorHtml += `<div class="pl-8 pr-4 py-2 flex flex-col gap-2">
                 <div class="bg-surface border border-error/30 rounded-lg overflow-hidden">
                   <div class="p-3 border-b border-error/20">
                     <div class="flex items-center gap-2 mb-1.5 text-error font-semibold text-xs font-label-caps">
                       <span class="material-symbols-outlined text-sm" aria-hidden="true">warning</span> Error Message
                     </div>
                     <pre class="font-mono text-xs text-error whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(errMsg)}</pre>
                   </div>`;
              if (test.errorObj && test.errorObj.snippet) {
                stepErrorHtml += `
                   <div class="p-3 bg-surface-container-lowest">
                     <div class="flex items-center gap-2 mb-1.5 text-on-surface-variant font-semibold text-xs font-label-caps">
                       <span class="material-symbols-outlined text-sm" aria-hidden="true">code</span> Source Snippet
                     </div>
                     <pre class="font-mono text-xs text-on-surface-variant whitespace-pre-wrap overflow-x-auto custom-scrollbar leading-relaxed">${escapeHtml(test.errorObj.snippet)}</pre>
                   </div>`;
              }
              stepErrorHtml += `</div></div>`;
            }

            if (hasChildren) {
              html += `
              <div class="flex flex-col border-b border-outline-variant/20 last:border-0">
                <button type="button" class="w-full text-left flex items-center gap-2 cursor-pointer hover:bg-surface-container p-2 rounded transition-colors group select-none text-xs" style="padding-left: ${paddingLeft}px" onclick="const c=this.nextElementSibling; const i=this.querySelector('.step-chevron'); const h=c.style.display==='none'; c.style.display=h?'block':'none'; i.style.transform=h?'rotate(0deg)':'rotate(-90deg)'">
                  <span class="material-symbols-outlined text-base step-chevron transition-transform text-on-surface-variant" style="transform: rotate(-90deg)" aria-hidden="true">arrow_drop_down</span>
                  <span class="material-symbols-outlined text-sm ${statusColor}" aria-hidden="true">${statusIcon}</span>
                  <span class="font-mono text-on-surface-variant text-xs w-5">${stepCount}</span>
                  <span class="text-on-surface group-hover:text-primary transition-colors truncate flex-1">${escapeHtml(step.title)}</span>
                  <span class="font-mono text-xs text-on-surface-variant tabular-nums">${formatDuration(step.duration)}</span>
                </button>
                <div class="step-children" style="display: none">
                  ${renderAllureSteps(step.steps, indent + 1)}
                </div>
              </div>`;
            } else {
              html += `
              <div class="flex flex-col border-b border-outline-variant/20 last:border-0">
                <div class="flex items-center gap-2 hover:bg-surface-container p-2 rounded transition-colors text-xs" style="padding-left: ${paddingLeft + 24}px">
                  <span class="material-symbols-outlined text-sm ${statusColor}" aria-hidden="true">${statusIcon}</span>
                  <span class="font-mono text-on-surface-variant text-xs w-5">${stepCount}</span>
                  <span class="text-on-surface truncate flex-1">${escapeHtml(step.title)}</span>
                  <span class="font-mono text-xs text-on-surface-variant tabular-nums">${formatDuration(step.duration)}</span>
                </div>
                ${stepErrorHtml}
              </div>`;
            }
          });
          return html;
        }

        let stepsHtml = renderAllureSteps(test.steps || []);
        if (!stepsHtml && test.error) {
          stepsHtml = `<div class="bg-surface border border-error/30 rounded-lg p-4">
            <pre class="font-mono text-xs text-error whitespace-pre-wrap">${escapeHtml(test.error)}</pre>
          </div>`;
        } else if (!stepsHtml) {
          stepsHtml = `<div class="text-xs text-on-surface-variant italic">Test completed in ${formatDuration(test.duration)} with no nested steps recorded.</div>`;
        }

        document.getElementById("allureExecutionBody").innerHTML = stepsHtml;
        document.getElementById("allureStepsCountBadge").textContent =
          stepCount.toString();

        // Populate Retries Tab
        if (test.results && test.results.length > 1) {
          const tabBtn = document.getElementById("allureReintentosTabBtn");
          tabBtn.classList.remove("hidden");
          document.getElementById("allureAttemptsCountBadge").textContent = (
            test.results.length - 1
          ).toString();

          let reintentosHtml = '<div class="flex flex-col gap-3">';
          test.results.forEach((res, idx) => {
            const statColor =
              normalizeStatusStr(res.status) === "passed"
                ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                : "text-error border-error/30 bg-error/10";
            const icon =
              normalizeStatusStr(res.status) === "passed"
                ? "check_circle"
                : "cancel";
            reintentosHtml += `
               <div class="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                 <div class="flex items-center gap-3">
                   <div class="flex items-center justify-center w-8 h-8 rounded-full ${statColor}">
                     <span class="material-symbols-outlined text-base" aria-hidden="true">${icon}</span>
                   </div>
                   <div class="flex flex-col">
                     <span class="text-sm font-bold text-on-surface">Attempt #${idx + 1}</span>
                     <span class="text-xs text-on-surface-variant font-mono">Duration: ${formatDuration(res.duration)}</span>
                   </div>
                 </div>
                 ${res.error ? `<span class="text-xs text-error font-mono bg-error/10 px-2.5 py-1 rounded truncate max-w-[260px]">${escapeHtml(res.error.message || "")}</span>` : ""}
               </div>
             `;
          });
          reintentosHtml += "</div>";
          document.getElementById("allureReintentosBody").innerHTML =
            reintentosHtml;
        } else {
          document
            .getElementById("allureReintentosTabBtn")
            .classList.add("hidden");
        }

        // Populate Attachments Tab
        if (test.attachments && test.attachments.length > 0) {
          const adjBadge = document.getElementById("allureAdjuntosCountBadge");
          if (adjBadge) {
            adjBadge.textContent = test.attachments.length.toString();
            adjBadge.classList.remove("hidden");
          }

          let adjuntosHtml =
            '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
          test.attachments.forEach((att) => {
            adjuntosHtml += `
               <div class="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary/50 transition-colors group">
                 <div class="flex items-center gap-3">
                   <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors text-xl" aria-hidden="true">attachment</span>
                   <div class="flex flex-col">
                     <span class="text-sm font-bold text-on-surface truncate max-w-[180px]">${escapeHtml(att.name)}</span>
                     <span class="text-xs text-on-surface-variant font-mono">${escapeHtml(att.contentType)}</span>
                   </div>
                 </div>
                 <span class="material-symbols-outlined text-base text-on-surface-variant group-hover:text-primary" aria-hidden="true">download</span>
               </div>
             `;
          });
          adjuntosHtml += "</div>";
          document.getElementById("allureAdjuntosBody").innerHTML =
            adjuntosHtml;
        } else {
          const adjBadge = document.getElementById("allureAdjuntosCountBadge");
          if (adjBadge) {
            adjBadge.textContent = "0";
            adjBadge.classList.add("hidden");
          }
        }

        // Populate History Tab
        const histBadge = document.getElementById("allureHistoryCountBadge");
        const testsHistory =
          (typeof GRIMOIR_HISTORY !== "undefined" &&
            GRIMOIR_HISTORY &&
            GRIMOIR_HISTORY.tests) ||
          {};
        const testHistoryList = testsHistory[test.testKey] || [];

        if (histBadge) {
          histBadge.textContent = testHistoryList.length.toString();
        }

        const historialBody = document.getElementById("allureHistorialBody");
        if (historialBody) {
          if (testHistoryList.length > 0) {
            let histHtml = '<div class="flex flex-col gap-3">';
            const reversedList = [...testHistoryList].reverse();
            reversedList.forEach((entry, idx) => {
              const runNumber = testHistoryList.length - idx;
              const isPassed = normalizeStatusStr(entry.status) === "passed";
              const isFailed = normalizeStatusStr(entry.status) === "failed";
              const statColor = isPassed
                ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10"
                : isFailed
                  ? "text-error border-error/20 bg-error/10"
                  : "text-outline border-outline-variant bg-surface-container";
              const icon = isPassed
                ? "check_circle"
                : isFailed
                  ? "cancel"
                  : "skip_next";
              const dateObj = new Date(entry.date);
              const formattedDate = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : entry.date;
              const isCurrent = idx === 0;

              histHtml += `
                <div class="flex items-center justify-between p-3.5 rounded-lg border border-outline-variant bg-surface-container-low hover:border-primary/40 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="flex items-center justify-center w-8 h-8 rounded-full ${statColor}">
                      <span class="material-symbols-outlined text-base" aria-hidden="true">${icon}</span>
                    </div>
                    <div class="flex flex-col">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-on-surface">Execution #${runNumber}</span>
                        ${isCurrent ? '<span class="text-xs uppercase tracking-wider font-bold bg-primary/20 text-primary px-2 py-0.5 rounded font-mono">Current</span>' : ""}
                      </div>
                      <span class="text-xs text-on-surface-variant font-mono">${escapeHtml(formattedDate)} • Duration: ${formatDuration(entry.duration)}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    ${entry.error ? `<span class="text-xs text-error font-mono bg-error/10 px-2 py-1 rounded max-w-[260px] truncate" title="${escapeHtml(entry.error)}">${escapeHtml(entry.error)}</span>` : ""}
                    <span class="text-xs uppercase font-bold px-2 py-0.5 rounded font-mono ${statColor}">${escapeHtml(entry.status)}</span>
                  </div>
                </div>
              `;
            });
            histHtml += "</div>";
            historialBody.innerHTML = histHtml;
          } else {
            historialBody.innerHTML = `
              <div class="text-sm text-on-surface-variant flex flex-col items-center justify-center py-20 gap-4">
                <span class="material-symbols-outlined text-5xl opacity-50 text-primary" aria-hidden="true">timeline</span>
                <p class="font-bold">No execution history recorded yet</p>
                <p class="text-xs opacity-70">Execute more test runs to build an execution timeline for this test.</p>
              </div>
            `;
          }
        }

        const modal = document.getElementById("allureModal");
        if (modal) {
          modal.classList.remove("hidden");
          modal.classList.add("flex");

          document.querySelectorAll(".allure-tab-content").forEach((el) => {
            el.classList.add("hidden", "opacity-0", "translate-y-4");
            el.classList.remove("opacity-100", "translate-y-0");
          });
          document.querySelectorAll("[data-allure-tab]").forEach((btn) => {
            btn.className =
              "px-1 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2 whitespace-nowrap";
            btn.setAttribute("aria-selected", "false");
          });

          const resumenTab = document.getElementById("allureTab-resumen");
          const resumenBtn = document.querySelector(
            '[data-allure-tab="resumen"]',
          );
          if (resumenTab && resumenBtn) {
            resumenTab.classList.remove("hidden");
            resumenBtn.className =
              "px-1 py-3 text-sm font-bold text-primary border-b-2 border-primary transition-colors flex items-center gap-2 whitespace-nowrap";
            resumenBtn.setAttribute("aria-selected", "true");
            void resumenTab.offsetWidth;
            resumenTab.classList.remove("opacity-0", "translate-y-4");
            resumenTab.classList.add("opacity-100", "translate-y-0");
          }

          if (!modal.dataset.tabsInitialized) {
            document.querySelectorAll("[data-allure-tab]").forEach((btn) => {
              btn.addEventListener("click", (e) => {
                const targetName =
                  e.currentTarget.getAttribute("data-allure-tab");

                document.querySelectorAll("[data-allure-tab]").forEach((b) => {
                  b.className =
                    "px-1 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-2 whitespace-nowrap";
                  b.setAttribute("aria-selected", "false");
                });
                e.currentTarget.className =
                  "px-1 py-3 text-sm font-bold text-primary border-b-2 border-primary transition-colors flex items-center gap-2 whitespace-nowrap";
                e.currentTarget.setAttribute("aria-selected", "true");

                document
                  .querySelectorAll(".allure-tab-content")
                  .forEach((contentDiv) => {
                    contentDiv.classList.add(
                      "hidden",
                      "opacity-0",
                      "translate-y-4",
                    );
                    contentDiv.classList.remove("opacity-100", "translate-y-0");
                  });

                const targetDiv = document.getElementById(
                  "allureTab-" + targetName,
                );
                if (targetDiv) {
                  targetDiv.classList.remove("hidden");
                  void targetDiv.offsetWidth;
                  targetDiv.classList.remove("opacity-0", "translate-y-4");
                  targetDiv.classList.add("opacity-100", "translate-y-0");
                }
              });
            });
            modal.dataset.tabsInitialized = "true";
          }

          const content = modal.querySelector(".modal-content");
          if (content) {
            content.style.transform = "scale(0.95)";
            content.style.opacity = "0";
            content.style.transition =
              "opacity 0.68s cubic-bezier(0.22, 1, 0.36, 1), transform 0.68s cubic-bezier(0.22, 1, 0.36, 1)";
          }

          void modal.offsetWidth;

          modal.classList.add("open");
          if (content) {
            content.style.transform = "scale(1)";
            content.style.opacity = "1";
          }
          if (resumenBtn) {
            resumenBtn.focus();
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

        [btnExec, btnExecs, btnArti].forEach((btn) => {
          if (!btn) return;
          btn.classList.add("text-on-surface-variant", "border-transparent");
          btn.classList.remove("text-primary", "border-primary");
          btn.setAttribute("aria-selected", "false");
        });

        [bodyExec, bodyExecs, bodyArti].forEach((body) => {
          if (body) body.classList.add("hidden");
        });

        if (tabName === "execution") {
          btnExec.classList.add("text-primary", "border-primary");
          btnExec.classList.remove(
            "text-on-surface-variant",
            "border-transparent",
          );
          btnExec.setAttribute("aria-selected", "true");
          bodyExec.classList.remove("hidden");
        } else if (tabName === "executions") {
          btnExecs.classList.add("text-primary", "border-primary");
          btnExecs.classList.remove(
            "text-on-surface-variant",
            "border-transparent",
          );
          btnExecs.setAttribute("aria-selected", "true");
          bodyExecs.classList.remove("hidden");
        } else {
          btnArti.classList.add("text-primary", "border-primary");
          btnArti.classList.remove(
            "text-on-surface-variant",
            "border-transparent",
          );
          btnArti.setAttribute("aria-selected", "true");
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
        let html = `<div class="flex flex-col gap-1.5 ${indent > 0 ? "ml-4 border-l border-outline-variant/40 pl-3" : "ml-0"}">`;
        steps.forEach((step) => {
          const isFailed = stepHasError(step);
          const statusColor = isFailed ? "text-error" : "text-emerald-400";
          const statusIcon = isFailed ? "close" : "check";
          const hasChildren = step.steps && step.steps.length > 0;
          const initialGrid = isFailed ? "1fr" : "0fr";
          const initialRotate = isFailed ? "rotate(0deg)" : "rotate(-90deg)";

          const errorMessage = step.error
            ? typeof step.error === "string"
              ? step.error
              : step.error.message || ""
            : "";
          const hasChildWithError =
            hasChildren && step.steps.some(stepHasError);
          const shouldShowErrorBox = errorMessage && !hasChildWithError;
          let errorHtml = "";
          if (shouldShowErrorBox) {
            errorHtml += `<div class="mt-1.5 flex flex-col gap-2 bg-surface rounded border border-error/30 overflow-hidden">
               <div class="p-2.5 ${testRef && testRef.errorObj && testRef.errorObj.snippet ? "border-b border-error/20" : ""}">
                 <pre class="font-mono text-xs text-error whitespace-pre-wrap break-words">${escapeHtml(errorMessage)}</pre>
               </div>`;
            if (testRef && testRef.errorObj && testRef.errorObj.snippet) {
              errorHtml += `<div class="p-2.5 bg-surface-container-lowest">
                 <pre class="font-mono text-xs text-on-surface-variant whitespace-pre-wrap">${escapeHtml(testRef.errorObj.snippet)}</pre>
               </div>`;
            }
            errorHtml += `</div>`;
          }

          if (hasChildren) {
            html += `
            <div class="flex flex-col gap-1">
              <button type="button" class="w-full text-left flex items-start gap-2 cursor-pointer hover:bg-surface-container-low p-1.5 rounded transition-colors duration-150 group select-none" onclick="const content = this.nextElementSibling; const chevron = this.querySelector('.step-chevron'); const isHidden = content.style.gridTemplateRows === '0fr'; content.style.gridTemplateRows = isHidden ? '1fr' : '0fr'; chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';">
                <span class="material-symbols-outlined text-base step-chevron transition-transform text-on-surface-variant shrink-0 mt-0.5" style="transform: ${initialRotate}; transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);" aria-hidden="true">expand_more</span>
                <span class="material-symbols-outlined text-base ${statusColor} shrink-0 mt-0.5" aria-hidden="true">${statusIcon}</span>
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-sans text-sm text-on-surface break-words group-hover:text-primary transition-colors">${escapeHtml(step.title)}</span>
                    <span class="font-mono text-xs text-on-surface-variant shrink-0 whitespace-nowrap tabular-nums">${formatDuration(step.duration)}</span>
                  </div>
                  ${errorHtml}
                </div>
              </button>
              <div class="grid transition-[grid-template-rows]" style="grid-template-rows: ${initialGrid}; transition-duration: 180ms; transition-timing-function: cubic-bezier(0.25, 1, 0.5, 1);">
                <div class="overflow-hidden">
                  ${renderSteps(step.steps, testRef, indent + 1)}
                </div>
              </div>
            </div>
            `;
          } else {
            html += `
            <div class="flex flex-col gap-1 p-1.5">
              <div class="flex items-start gap-2">
                <span class="w-4 shrink-0"></span>
                <span class="material-symbols-outlined text-base ${statusColor} shrink-0 mt-0.5" aria-hidden="true">${statusIcon}</span>
                <div class="flex flex-col flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <span class="font-sans text-sm text-on-surface break-words">${escapeHtml(step.title)}</span>
                    <span class="font-mono text-xs text-on-surface-variant shrink-0 whitespace-nowrap tabular-nums">${formatDuration(step.duration)}</span>
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

      // Hook up filters, search clear, and keyboard tree navigation for Automated Split Pane
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
                "border-outline-variant",
                "bg-surface-container",
                "text-on-surface-variant",
              );
              b.setAttribute("aria-pressed", "false");
            });
            const target = e.currentTarget;
            target.classList.remove(
              "border-outline-variant",
              "bg-surface-container",
              "text-on-surface-variant",
            );
            target.classList.add(
              "border-primary/40",
              "bg-primary/20",
              "text-primary",
              "active",
            );
            target.setAttribute("aria-pressed", "true");

            currentFilter = target.getAttribute("data-filter");
            renderAutomatedTree();
          });
        });

        const searchInput = document.getElementById("automatedSearch");
        const clearAutoSearchBtn = document.getElementById(
          "clearAutomatedSearch",
        );

        function clearAutomatedSearchField() {
          currentSearch = "";
          if (searchInput) searchInput.value = "";
          if (clearAutoSearchBtn) clearAutoSearchBtn.classList.add("hidden");
          renderAutomatedTree();
          if (searchInput) searchInput.focus();
        }

        if (searchInput) {
          const debouncedRenderAutomated =
            typeof debounce === "function"
              ? debounce(() => {
                  renderAutomatedTree();
                }, 200)
              : null;

          searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            if (clearAutoSearchBtn) {
              clearAutoSearchBtn.classList.toggle(
                "hidden",
                currentSearch.length === 0,
              );
            }
            if (debouncedRenderAutomated) {
              debouncedRenderAutomated();
            } else {
              renderAutomatedTree();
            }
          });

          searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && searchInput.value.length > 0) {
              e.stopPropagation();
              clearAutomatedSearchField();
            }
          });
        }

        if (clearAutoSearchBtn) {
          clearAutoSearchBtn.addEventListener(
            "click",
            clearAutomatedSearchField,
          );
        }

        // Event Delegation & Keyboard Navigation for Automated Tree
        const autoContainer = document.getElementById("automatedTreeContainer");
        if (autoContainer) {
          autoContainer.addEventListener("click", (e) => {
            // 1. Handle Suite Folders (Accordion)
            const header = e.target.closest(".suite-header");
            if (header) {
              const suite = header.getAttribute("data-suite");
              const isFile = header.getAttribute("data-is-file") === "true";
              const content = header.nextElementSibling;
              const treeItem = header.parentElement;
              const icon = header.querySelector(".folder-icon");
              const chevron = header.querySelector(".chevron-icon");

              if (expandedSuites.has(suite)) {
                expandedSuites.delete(suite);
                content.style.gridTemplateRows = "0fr";
                if (treeItem) treeItem.setAttribute("aria-expanded", "false");
                if (!isFile && icon) icon.textContent = "folder";
                if (chevron) chevron.style.transform = "rotate(-90deg)";
              } else {
                expandedSuites.add(suite);
                content.style.gridTemplateRows = "1fr";
                if (treeItem) treeItem.setAttribute("aria-expanded", "true");
                if (!isFile && icon) icon.textContent = "folder_open";
                if (chevron) chevron.style.transform = "rotate(0deg)";
              }
              return;
            }

            // 2. Handle Test Selection
            const testItem = e.target.closest(".test-tree-item");
            if (testItem) {
              autoContainer.querySelectorAll(".test-tree-item").forEach((i) => {
                i.classList.remove("bg-primary/20", "border-primary/40");
                i.classList.add("border-transparent");
              });
              testItem.classList.remove("border-transparent");
              testItem.classList.add("bg-primary/20", "border-primary/40");
              const testId = testItem.getAttribute("data-id");
              const test = allAutomatedTests.find((t) => t.id === testId);
              if (test) showTestDetails(test);
            }
          });

          // ArrowUp / ArrowDown / Home / End keyboard navigation inside the tree
          autoContainer.addEventListener("keydown", (e) => {
            if (
              e.key !== "ArrowDown" &&
              e.key !== "ArrowUp" &&
              e.key !== "Home" &&
              e.key !== "End"
            ) {
              return;
            }
            const visibleNodes = Array.from(
              autoContainer.querySelectorAll(
                ".suite-header, .test-tree-item",
              ),
            ).filter((el) => {
              // Exclude items inside a collapsed suite-content (gridTemplateRows === "0fr")
              let parent = el.parentElement;
              while (parent && parent !== autoContainer) {
                if (
                  parent.classList.contains("suite-content") &&
                  parent.style.gridTemplateRows === "0fr"
                ) {
                  return false;
                }
                parent = parent.parentElement;
              }
              return el.offsetParent !== null;
            });

            if (visibleNodes.length === 0) return;
            const currentIndex = visibleNodes.indexOf(document.activeElement);
            if (currentIndex === -1) return;

            let nextIndex = currentIndex;
            if (e.key === "ArrowDown") {
              nextIndex = Math.min(visibleNodes.length - 1, currentIndex + 1);
            } else if (e.key === "ArrowUp") {
              nextIndex = Math.max(0, currentIndex - 1);
            } else if (e.key === "Home") {
              nextIndex = 0;
            } else if (e.key === "End") {
              nextIndex = visibleNodes.length - 1;
            }

            if (nextIndex !== currentIndex) {
              e.preventDefault();
              const nextEl = visibleNodes[nextIndex];
              nextEl.focus();
              if (nextEl.classList.contains("test-tree-item")) {
                nextEl.click();
              }
            }
          });
        }
      });

      // Magic Dust (Canvas Particles — Disabled under prefers-reduced-motion and paused when off-screen/hidden)
      (function () {
        const prefersReducedMotion =
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) return;

        const canvas = document.getElementById("magicDust");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        window.addEventListener(
          "resize",
          () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
          },
          { passive: true },
        );

        const particles = [];
        for (let i = 0; i < 34; i++) {
          const rand = Math.random();
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 1.45 + 0.35,
            dx: (Math.random() - 0.5) * 0.09,
            dy: Math.random() * -0.26 - 0.06,
            color:
              rand > 0.35
                ? rand > 0.68
                  ? "rgba(138, 79, 255, 0.52)"
                  : "rgba(179, 136, 255, 0.38)"
                : rand > 0.18
                  ? "rgba(229, 197, 131, 0.42)"
                  : "rgba(197, 160, 89, 0.32)",
          });
        }

        function animate() {
          if (!document.hidden) {
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p) => {
              p.x += p.dx;
              p.y += p.dy;
              if (p.y < -10) p.y = height + 10;
              if (p.x < -10) p.x = width + 10;
              if (p.x > width + 10) p.x = -10;

              ctx.beginPath();
              ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
              ctx.fillStyle = p.color;
              ctx.shadowBlur = 5;
              ctx.shadowColor = p.color;
              ctx.fill();
            });
          }
          requestAnimationFrame(animate);
        }
        animate();
      })();
