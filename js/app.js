"use strict";

// The Activity Class
class Activity {
  constructor(activityType, activityIcon) {
    this.activityType = activityType;
    if (activityIcon)
      this.activityIcon = activityIcon.replace("fa-4x", "fa-2x");
  }
}

// The Task Class
class Task extends Activity {
  constructor(activityType, task, timePeriod, checked = false) {
    super(activityType);
    // this.activityType = activityType;
    this.task = task;
    this.timePeriod = timePeriod;
    this.checked = checked;
  }
}

// The HTML Elements

// The App Activity's Elements
const [appActivity, btnActivityMenu, selectActivity, activities] = [
  document.querySelector("#app-activity"),
  document.querySelector("#btn-activity-menu"),
  document.querySelector("#select-activity"),
  document.querySelector("#activities"),
];

// The App Task's Elements
const [
  appTask,
  btnGoToAppActivity,
  appTaskTitle,
  btnDeleteAllTasks,
  tasksCount,
  formAddTask,
  inputAddTask,
  includeTimePeriod,
  tasks,
] = [
  document.querySelector("#app-task"),
  document.querySelector("#btn-go-to-app-acitivty"),
  document.querySelector("#app-task-title"),
  document.querySelector("#btn-delete-all-tasks"),
  document.querySelector("#tasks-count"),
  document.querySelector("#form-add-task"),
  document.querySelector("#input-add-task"),
  document.querySelector("#include-time-period"),
  document.querySelector("#tasks"),
];

const ctx = document.querySelector("#task-chart").getContext("2d");
const offcanvasBody = document.querySelector(".offcanvas-body");

// The App Class
class App {
  #activities = [];
  #currentActivity;

  #taskChart;

  #currentActivityTasks = [];
  #currentTask;

  #time;
  #timerInterval;

  #dateTimeFormat = new Intl.DateTimeFormat(navigator.language, {
    day: "numeric",
    weekday: "short",
    year: "numeric",
  }).format(new Date());

  #colors = {
    primary: getComputedStyle(document.documentElement).getPropertyValue(
      "--bs-primary"
    ),

    secondary: getComputedStyle(document.documentElement).getPropertyValue(
      "--bs-secondary"
    ),
  };

  constructor() {
    this._getActivites();

    btnActivityMenu.addEventListener("click", () => {
      const btnDeleteAllActivities = this._createOffcanvasBtns();
      btnDeleteAllActivities.innerHTML = `
      <span>
        <i class="fa fa-trash-o"></i>
      </span>
      <span class="ms-2">Delete all activities</span>
      `;

      btnDeleteAllActivities.addEventListener("click", () => {
        this._modalConfirm("activities");
      });
    });

    // Starting the timer and getting the current activity
    activities.addEventListener("mousedown", (e) => {
      const activityHTML = e.target.closest(".activity");

      if (!activityHTML) return;

      this.#currentActivity = this.#activities.find(
        (activity) =>
          activity.activityType ===
          activityHTML.children[1].firstElementChild.textContent.trim()
      );

      this._timer("activity");
    });

    // Stopping the timer and going to the app task page
    activities.addEventListener("mouseup", (e) => {
      const activityHTML = e.target.closest(".activity");

      if (!activityHTML) return;

      if (this.#time >= 0) this._goToAppTask();

      clearInterval(this.#timerInterval);
    });

    selectActivity.addEventListener("click", this._createActivity.bind(this));

    // Going to the app activity page
    btnGoToAppActivity.addEventListener("click", () => {
      this._switchPages(appTask, appActivity);
    });

    btnDeleteAllTasks.addEventListener("click", () => {
      this._modalConfirm("tasks");
    });

    formAddTask.addEventListener("submit", this._createTask.bind(this));

    // Starting the timer and getting the current task
    tasks.addEventListener("mousedown", (e) => {
      const taskHTML = e.target.closest(".task");

      if (!taskHTML) return;

      this.#currentTask = this.#currentActivityTasks.find(
        (currentActivityTask) =>
          currentActivityTask.task ===
          taskHTML.children[0].lastElementChild.textContent.trim()
      );

      if (e.target.classList.contains("form-check-input")) {
        const input = e.target;
        if (!input.checked) this.#currentTask.checked = true;
        else this.#currentTask.checked = false;

        this._saveTasks();
        this._taskChart();
      }

      this._timer("task");
    });

    // Stopping the timer
    tasks.addEventListener("mouseup", (e) => {
      const taskHTML = e.target.closest(".task");

      if (!taskHTML) return;

      clearInterval(this.#timerInterval);
    });
  }

  // Creating offcanvas buttons
  _createOffcanvasBtns() {
    $(".offcanvas").offcanvas("show");

    offcanvasBody.innerHTML = "";
    const btn = document.createElement("button");
    btn.setAttribute("type", "button");
    btn.setAttribute("data-bs-dismiss", "offcanvas");
    btn.className = "btn btn-link w-100 p-3";

    offcanvasBody.append(btn);

    return btn;
  }

  // Checking activity buttons
  _checkActivityBtns() {
    document.querySelectorAll(".btn-activity").forEach((btnActivity) => {
      btnActivity.disabled = false;
      this.#activities.forEach((activity) => {
        if (
          activity.activityType ===
          btnActivity.lastElementChild.textContent.trim()
        )
          btnActivity.disabled = true;
      });
    });
  }

  // Saving activities to the Local Storage
  _saveActivities() {
    localStorage.setItem("activities", JSON.stringify(this.#activities));
  }

  // Rendering activities
  _renderActivities() {
    activities.innerHTML = "";
    this.#activities.forEach((activity) => {
      const html = `
        <div class="activity d-flex align-items-center btn-link rounded shadow p-4 my-4">
          <div class="col-2 text-start">
            <i class="${activity.activityIcon}"></i>
          </div>
          <div class="col-8 text-start">
            <h5 class="mb-0">${activity.activityType}</h5>
          </div>
          <div class="col-2 text-end">
            <i class="fa fa-angle-right fa-2x"></i>
          </div>
        </div>
        `;

      activities.insertAdjacentHTML("afterbegin", html);
    });

    this._checkActivityBtns();
  }

  // Deleting the current activity
  _deleteCurrentActivity() {
    const indexOfCurrentActivity = this.#activities.indexOf(
      this.#currentActivity
    );

    this.#activities.splice(indexOfCurrentActivity, 1);
    localStorage.removeItem(this.#currentActivity.activityType);

    this._saveActivities();
    this._renderActivities();

    location.reload();
  }

  // Deleting all the activities
  _deleteAllActivities() {
    localStorage.clear();
    location.reload();
  }

  // Getting the tasks from the Local Storage for current activity
  _getCurrentActivityTasks() {
    const currentTasks = JSON.parse(
      localStorage.getItem(this.#currentActivity.activityType)
    );

    if (!currentTasks) return;

    this.#currentActivityTasks = currentTasks;
  }

  // Rendering the tasks
  _renderTasks() {
    tasks.innerHTML = "";

    this.#currentActivityTasks.forEach((currentActivityTask, index) => {
      let html = `
        <div class="task w-100 btn-link rounded shadow p-4 my-4">
          <span>
            <input
              type="checkbox"
              name="checkbox-task-${index}"
              id="checkbox-task-${index}"
              class="form-check-input"
              ${currentActivityTask.checked ? "checked" : ""}
            />
            <label for="" class="ms-2">${currentActivityTask.task}</label>
          </span>
          ${
            currentActivityTask.timePeriod
              ? `<span class="d-flex text-muted"
                  style="font-size: 14px"
                >
                  ${currentActivityTask.timePeriod}
                </span>`
              : `<span class="d-none"></span>`
          }
        </div>
          `;

      tasks.insertAdjacentHTML("afterbegin", html);
    });
  }

  // Going to the task page
  _goToAppTask() {
    this._switchPages(appActivity, appTask);

    this.#currentActivityTasks = [];

    this._getCurrentActivityTasks();

    appTaskTitle.textContent = this.#dateTimeFormat;
    tasksCount.textContent = this._calcTasksCount();

    this._renderTasks();
    this._taskChart();
  }

  // Deleting all the tasks for current activity
  _deleteAllTasks() {
    localStorage.removeItem(this.#currentActivity.activityType);
    location.reload();

    this._goToAppTask();
  }

  // Saving the tasks to the Local Storage
  _saveTasks() {
    localStorage.setItem(
      this.#currentActivity.activityType,
      JSON.stringify(this.#currentActivityTasks)
    );
  }

  // Deleting current task
  _deleteCurrentTask() {
    const indexOfCurrentTask = this.#currentActivityTasks.indexOf(
      this.#currentTask
    );

    this.#currentActivityTasks.splice(indexOfCurrentTask, 1);

    this._saveTasks();

    location.reload();
  }

  // Confirming the deleting operation
  _modalConfirm(type) {
    $("#modal-confirm").modal("show");

    document.querySelector(
      "#modal-confirm-text"
    ).textContent = `Do you want to delete ${
      type === "activities" || type === "tasks" ? `all` : `this`
    } ${type}?`;

    document
      .querySelector("#btn-modal-confirm")
      .addEventListener("click", () => {
        if (type === "activities") this._deleteAllActivities();

        if (type === "activity") this._deleteCurrentActivity();

        if (type === "tasks") this._deleteAllTasks();

        if (type === "task") this._deleteCurrentTask();
      });
  }

  // The timer function
  _timer(type) {
    this.#time = 1.5;
    const tick = () => {
      this.#time--;
      if (this.#time < 0) {
        if (type === "activity") {
          const btnDeleteCurrentActivity = this._createOffcanvasBtns();
          btnDeleteCurrentActivity.innerHTML = `
          <span>
            <i class="fa fa-trash-o"></i>
          </span>
          <span class="ms-2">Delete this activity</span>
          `;

          btnDeleteCurrentActivity.addEventListener("click", () => {
            this._modalConfirm("activity");
          });
        }

        if (type === "task") {
          const btnDeleteCurrentTask = this._createOffcanvasBtns();
          btnDeleteCurrentTask.innerHTML = `
          <span>
            <i class="fa fa-trash-o"></i>
          </span>
          <span class="ms-2">Delete this activity</span>
          `;

          btnDeleteCurrentTask.addEventListener("click", () => {
            this._modalConfirm("task");
          });
        }

        clearInterval(this.#timerInterval);
      }
    };

    tick();
    this.#timerInterval = setInterval(tick, 1000);
  }

  // Getting activities from the Local Storage
  _getActivites() {
    const activities = JSON.parse(localStorage.getItem("activities"));

    if (!activities) return;

    this.#activities = activities;
    this._renderActivities();
  }

  // Creating an activity
  _createActivity(e) {
    const btnActivity = e.target.closest(".btn-activity");

    if (!btnActivity) return;

    const activityType = btnActivity.lastElementChild.textContent.trim();
    const activityIcon = btnActivity.firstElementChild.className.trim();

    if (!activityType) return;

    const activity = new Activity(activityType, activityIcon);

    this.#activities.push(activity);

    this._saveActivities();
    this._renderActivities();
  }

  // Switching pages
  _switchPages(from, to) {
    from.id === "app-activity" && to.id === "app-task"
      ? `${(from.style.transform = to.style.transform = "translateX(-100%)")}`
      : `${(from.style.transform = to.style.transform = "translateX(0%)")}`;
  }

  // Calculating tasks count
  _calcTasksCount() {
    return `${this.#currentActivityTasks.length} Tasks`;
  }

  // Showing error/warning message to user
  _modalWarning(text) {
    $("#modal-warning").modal("show");

    document.querySelector("#modal-warning-text").textContent = text;
  }

  // Checking and confirming the task input
  _checkTaskInput(input) {
    if (input.value === "")
      this._modalWarning("The task input can't be empty.");
    else return input;
  }

  // Getting time period (interval)
  _getTimePeriod() {
    const [
      selectStartHour,
      selectStartMinute,
      selectStartAmPm,
      selectFinishHour,
      selectFinishMinute,
      selectFinishAmPm,
    ] = [
      document.querySelector("#select-start-hour"),
      document.querySelector("#select-start-minute"),
      document.querySelector("#select-start-am-pm"),
      document.querySelector("#select-finish-hour"),
      document.querySelector("#select-finish-minute"),
      document.querySelector("#select-finish-am-pm"),
    ];

    return `${selectStartHour.value}:${
      selectStartMinute.value
    } ${selectStartAmPm.value.toUpperCase()} - ${selectFinishHour.value}:${
      selectFinishMinute.value
    } ${selectFinishAmPm.value.toUpperCase()}`;
  }

  // Creating new tasks
  _createTask(e) {
    e.preventDefault();

    const taskInput = this._checkTaskInput(inputAddTask);

    if (taskInput) {
      if (
        this.#currentActivityTasks.some(
          (currentActivityTask) => currentActivityTask.task === taskInput.value
        )
      )
        this._modalWarning("This text already exists.");
      else {
        let task;

        !includeTimePeriod.checked
          ? (task = new Task(
              this.#currentActivity.activityType,
              taskInput.value
            ))
          : (task = new Task(
              this.#currentActivity.activityType,
              taskInput.value,
              this._getTimePeriod()
            ));

        this.#currentActivityTasks.push(task);

        this._saveTasks();
        this._renderTasks();

        tasksCount.textContent = this._calcTasksCount();

        inputAddTask.value = "";

        this._taskChart();
      }
    }
  }

  // Task chart data by incompleted and completed tasks
  _taskChart() {
    const completedTasks = this.#currentActivityTasks.filter(
      (currentActivityTask) => currentActivityTask.checked === true
    );

    const incompletedTasks = this.#currentActivityTasks.filter(
      (currentActivityTask) => currentActivityTask.checked === false
    );

    if (this.#taskChart) this.#taskChart.destroy();

    this.#taskChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Completed", "incompleted"],
        datasets: [
          {
            data: [completedTasks.length, incompletedTasks.length],
            backgroundColor: [this.#colors.primary, this.#colors.secondary],
            borderColor: [this.#colors.secondary, this.#colors.primary],
          },
        ],
      },
    });

    const allTasks = completedTasks.length + incompletedTasks.length;

    document.querySelector("#task-chart-info").innerHTML = `
    <h3 class="text-primary mb-0" id="task-chart-percent">
      ${
        allTasks === 0
          ? "🤔"
          : `${((completedTasks.length * 100) / allTasks).toFixed(1)}%`
      }
    </h3>
    <p
      class="text-primary mb-0 fw-semi-bold fs-4"
      id="task-chart-text"
    >
      ${
        allTasks === 0
          ? ""
          : `${completedTasks.length === 0 ? "" : "COMPLETED!"}`
      }
    </p>
    <p class="text-muted mb-0 my-2">
      ${
        allTasks === 0
          ? "Add some tasks to finish them!"
          : `${
              incompletedTasks.length === 0
                ? "Congratulations! You have finished all the tasks."
                : `There are still ${incompletedTasks.length} tasks to finish here.`
            }`
      }
    </p>
    `;

    this.#taskChart.update();
  }
}

const app = new App();