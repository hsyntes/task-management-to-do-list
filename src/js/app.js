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

    this.task = task;
    this.timePeriod = timePeriod;
    this.checked = checked;
  }
}

// The HTML Elements
// The App Splash Element
const [appSplash, appSplashIcon] = [
  document.querySelector("#app-splash"),
  document.querySelector("#app-splash-icon"),
];

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
  appTaskMain,
  btnGoToAppActivity,
  appTaskTitle,
  btnDeleteAllTasks,
  tasksCount,
  formAddTask,
  inputAddTask,
  formEditTask,
  inputEditTask,
  tasks,
  currentTasks,
  btnSearchTask,
] = [
  document.querySelector("#app-task"),
  document.querySelector("#app-task-main"),
  document.querySelector("#btn-go-to-app-acitivty"),
  document.querySelector("#app-task-title"),
  document.querySelector("#btn-delete-all-tasks"),
  document.querySelector("#tasks-count"),
  document.querySelector("#form-add-task"),
  document.querySelector("#input-add-task"),
  document.querySelector("#form-edit-task"),
  document.querySelector("#input-edit-task"),
  document.querySelectorAll(".tasks"),
  document.querySelector("#current-tasks"),
  document.querySelector("#btn-search-task"),
];

// The time period elements for adding tasks
const [
  includeTimeAddPeriod,
  selectStartAddHour,
  selectStartAddMinute,
  selectStartAddAmPm,
  selectFinishAddHour,
  selectFinishAddMinute,
  selectFinishAddAmPm,
] = [
  document.querySelector("#include-time-add-period"),
  document.querySelector("#select-start-add-hour"),
  document.querySelector("#select-start-add-minute"),
  document.querySelector("#select-start-add-am-pm"),
  document.querySelector("#select-finish-add-hour"),
  document.querySelector("#select-finish-add-minute"),
  document.querySelector("#select-finish-add-am-pm"),
];

// The time period elements for edting the tasks
const [
  includeTimeEditPeriod,
  selectStartEditHour,
  selectStartEditMinute,
  selectStartEditAmPm,
  selectFinishEditHour,
  selectFinishEditMinute,
  selectFinishEditAmPm,
] = [
  document.querySelector("#include-time-edit-period"),
  document.querySelector("#select-start-edit-hour"),
  document.querySelector("#select-start-edit-minute"),
  document.querySelector("#select-start-edit-am-pm"),
  document.querySelector("#select-finish-edit-hour"),
  document.querySelector("#select-finish-edit-minute"),
  document.querySelector("#select-finish-edit-am-pm"),
];

// The Modal-search-task elements
const [inputSearchTask, searchedTasks] = [
  document.querySelector("#input-search-task"),
  document.querySelector("#searched-tasks"),
];

// The task chart element
const ctx = document.querySelector("#task-chart").getContext("2d");

// The Offcanvas element
const offcanvasBody = document.querySelector(".offcanvas-body");

// The App Class
class App {
  #activities = [];
  #currentActivity;

  #heights = {
    navbarHeight: document
      .querySelector("#app-task-navbar")
      .getBoundingClientRect().height,
    headerHeight: document
      .querySelector("#app-task-header")
      .getBoundingClientRect().height,
    appAreaHeight: Number(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--app-area")
        .trim()
        .substring(0, 2) * 2
    ),
  };

  #appTaskMainTop = `${
    this.#heights.navbarHeight +
    this.#heights.headerHeight +
    this.#heights.appAreaHeight
  }px`;

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

  #userCurrentHour;
  #userCurrentMinute;

  #colors = {
    primary: getComputedStyle(document.documentElement).getPropertyValue(
      "--bs-primary"
    ),

    secondary: getComputedStyle(document.documentElement).getPropertyValue(
      "--bs-secondary"
    ),
  };

  constructor() {
    appSplashIcon.animate(
      [
        {
          transform: "rotateZ(2.5deg)",
        },
        {
          transform: "rotateZ(2.5deg)",
        },
        {
          transform: "rotateZ(0deg)",
        },
      ],
      {
        duration: 800,
      }
    );

    setTimeout(() => {
      appSplash.classList.add("d-none");
      appActivity.classList.remove("d-none");
      appTask.classList.remove("d-none");

      this._getActivites();

      btnActivityMenu.addEventListener("click", () => {
        offcanvasBody.innerHTML = "";
        $(".offcanvas").offcanvas("show");

        const btnDeleteAllActivities = this._createOffcanvasBtns();

        btnDeleteAllActivities.innerHTML = `
        <span>
          <i class="fa fa-trash"></i>
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
        btnSearchTask.style.transform = "translateY(200%)";

        setTimeout(() => {
          btnSearchTask.classList.add("d-none");
          this._switchPages(appTask, appActivity);
          appTaskMain.style.position = "block";
        }, 300);
      });

      btnDeleteAllTasks.addEventListener("click", () => {
        this._modalConfirm("tasks");
      });

      formAddTask.addEventListener("submit", this._addTask.bind(this));

      // Setting default margin-top value for main element which position is fixed
      appTaskMain.style.top = this.#appTaskMainTop;

      // When appTaskMain scrolled
      appTaskMain.addEventListener("scroll", () => {
        if (appTaskMain.scrollTop === 0)
          appTaskMain.style.top = this.#appTaskMainTop;
        else appTaskMain.style.top = "0%";
      });

      // Starting the timer and getting the current task
      tasks.forEach((task) => {
        task.addEventListener("mousedown", (e) => {
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
            this._renderTasks();
            this._taskChart();
          }

          this._timer("task");
        });
      });

      // Stopping the timer
      tasks.forEach((task) => {
        task.addEventListener("mouseup", (e) => {
          const taskHTML = e.target.closest(".task");

          if (!taskHTML) return;

          clearInterval(this.#timerInterval);
        });
      });

      formEditTask.addEventListener("submit", this._editTask.bind(this));

      inputSearchTask.addEventListener("keyup", this._searchedTask.bind(this));
    }, 800);
  }

  // Creating offcanvas buttons
  _createOffcanvasBtns() {
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
  _saveActivities = () =>
    localStorage.setItem("activities", JSON.stringify(this.#activities));

  // Rendering activities
  _renderActivities() {
    activities.innerHTML = "";

    this.#activities.forEach((activity) => {
      const html = `
        <div class="activity d-flex align-items-center btn btn-link rounded shadow p-4 my-4">
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
    const indexOfCurrentActivity = this.#activities.findIndex(
      (activity) => activity === this.#currentActivity
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
    currentTasks.innerHTML = "";

    this.#currentActivityTasks.forEach((currentActivityTask, index) => {
      const html = `
        <div class="task w-100 btn-link rounded shadow p-4 mt-4">
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

      currentTasks.insertAdjacentHTML("afterbegin", html);
    });
  }

  // Going to the task page
  _goToAppTask() {
    this._switchPages(appActivity, appTask);

    this.#currentActivityTasks = [];

    this._getCurrentActivityTasks();

    appTaskTitle.textContent = this.#dateTimeFormat;
    tasksCount.textContent = this._calcTasksCount();
    appTaskMain.style.position = "fixed";

    btnSearchTask.classList.remove("d-none");
    setTimeout(() => {
      btnSearchTask.style.transform = "translateY(0%)";
    }, 300);

    this._renderTasks();
    this._taskChart();
    this._upcomingTask();
  }

  // Deleting all the tasks for current activity
  _deleteAllTasks() {
    localStorage.removeItem(this.#currentActivity.activityType);

    location.reload();

    this._goToAppTask();
  }

  // Saving the tasks to the Local Storage
  _saveTasks = () =>
    localStorage.setItem(
      this.#currentActivity.activityType,
      JSON.stringify(this.#currentActivityTasks)
    );

  // Deleting current task
  _deleteCurrentTask() {
    const indexOfCurrentTask = this.#currentActivityTasks.findIndex(
      (currentActivityTask) => currentActivityTask === this.#currentTask
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
    this.#time = 1;

    const tick = () => {
      this.#time--;

      if (this.#time < 0) {
        if (type === "activity") {
          offcanvasBody.innerHTML = "";
          $(".offcanvas").offcanvas("show");

          const btnDeleteCurrentActivity = this._createOffcanvasBtns();
          btnDeleteCurrentActivity.innerHTML = `
          <span>
            <i class="fa fa-trash"></i>
          </span>
          <span class="ms-2">Delete this activity</span>
          `;

          btnDeleteCurrentActivity.addEventListener("click", () => {
            this._modalConfirm("activity");
          });
        }

        if (type === "task") {
          offcanvasBody.innerHTML = "";

          $(".offcanvas").offcanvas("show");
          $("#modal-search-task").modal("hide");

          const btnEditCurrentTask = this._createOffcanvasBtns();
          btnEditCurrentTask.innerHTML = `
          <span>
            <i class="fa fa-pencil"></i>
          </span>
          <span class="ms-2">Edit this task</span>
          `;
          btnEditCurrentTask.setAttribute("data-bs-toggle", "modal");
          btnEditCurrentTask.setAttribute("data-bs-target", "#modal-edit-task");
          btnEditCurrentTask.addEventListener("click", () => {
            inputEditTask.value = this.#currentTask.task;

            if (this.#currentTask.timePeriod) {
              includeTimeEditPeriod.checked = true;

              document
                .querySelector("#collapse-time-edit-period")
                .classList.add("show");

              const taskTimePeriod = this.#currentTask.timePeriod.split("-");
              const [taskStarts, taskFinishs] = [...taskTimePeriod];

              const [
                taskStartHour,
                taskStartMinute,
                taskStartAmPm,
                taskFinishHour,
                taskFinishMinute,
                taskFinishAmPm,
              ] = [
                taskStarts.slice(0, 2),
                taskStarts.slice(3, 5),
                taskStarts.slice(6, 8),
                taskFinishs.trim().slice(0, 2),
                taskFinishs.trim().slice(3, 5),
                taskFinishs.trim().slice(6, 8),
              ];

              [
                selectStartEditHour.value,
                selectStartEditMinute.value,
                selectStartEditAmPm.value,

                selectFinishEditHour.value,
                selectFinishEditMinute.value,
                selectFinishEditAmPm.value,
              ] = [
                taskStartHour,
                taskStartMinute,
                taskStartAmPm.toLowerCase(),
                taskFinishHour,
                taskFinishMinute,
                taskFinishAmPm.toLowerCase(),
              ];
            } else {
              includeTimeEditPeriod.checked = false;

              document
                .querySelector("#collapse-time-edit-period")
                .classList.remove("show");

              this._clearTimePeriod();
            }
          });

          const btnDeleteCurrentTask = this._createOffcanvasBtns();
          btnDeleteCurrentTask.innerHTML = `
          <span>
            <i class="fa fa-trash"></i>
          </span>
          <span class="ms-2">Delete this task</span>
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
  _switchPages = (from, to) =>
    from.id === "app-activity" && to.id === "app-task"
      ? `${(from.style.transform = to.style.transform = "translateX(-100%)")}`
      : `${(from.style.transform = to.style.transform = "translateX(0%)")}`;

  // Calculating tasks count
  _calcTasksCount = () => `${this.#currentActivityTasks.length} Tasks`;

  // Showing error/warning message to user
  _modalWarning(text) {
    $("#modal-warning").modal("show");

    document.querySelector("#modal-warning-text").textContent = text;
  }

  // Checking and confirming the task input
  _checkTaskInput = (input) =>
    input.value === ""
      ? this._modalWarning("The task input can't be empty.")
      : input;

  // Getting time period (interval)
  _getTimePeriod = (type) =>
    type === "new"
      ? `${selectStartAddHour.value}:${
          selectStartAddMinute.value
        } ${selectStartAddAmPm.value.toUpperCase()} - ${
          selectFinishAddHour.value
        }:${
          selectFinishAddMinute.value
        } ${selectFinishAddAmPm.value.toUpperCase()}`
      : `${selectStartEditHour.value}:${
          selectStartEditMinute.value
        } ${selectStartEditAmPm.value.toUpperCase()} - ${
          selectFinishEditHour.value
        }:${
          selectFinishEditMinute.value
        } ${selectFinishEditAmPm.value.toUpperCase()}`;

  // Resetting time period
  _clearTimePeriod() {
    selectStartAddHour.selectedIndex =
      selectStartAddMinute.selectedIndex =
      selectFinishAddHour.selectedIndex =
      selectFinishAddMinute.selectedIndex =
      selectStartAddAmPm.selectedIndex =
      selectFinishAddAmPm.selectedIndex =
        0;

    includeTimeAddPeriod.checked = false;

    document
      .querySelector("#collapse-time-add-period")
      .classList.remove("show");
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

  // Sending notification to the user
  _sendNotification = (task, time) =>
    new Notification(
      `Upcoming Task, ${
        time === 0 ? "it's time to start right now!" : `last ${time} minutes!`
      }`,
      {
        body: `${task}`,
        icon: "../img/icon.png",
      }
    );

  // Checking upcoming of the task time
  _upcomingTask() {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        this.#currentActivityTasks
          .filter(
            (currentActivityTask) =>
              typeof currentActivityTask.timePeriod !== "undefined" &&
              currentActivityTask.checked === false
          )
          .forEach((taskHasTimePeriod) => {
            let [taskStartHour, taskStartMinute, taskTimeFormat] = [
              taskHasTimePeriod.timePeriod.slice(0, 2),
              taskHasTimePeriod.timePeriod.trim().slice(3, 5),
              taskHasTimePeriod.timePeriod.trim().slice(6, 8),
            ];

            this.#userCurrentHour = new Date().getHours();
            this.#userCurrentMinute = new Date().getMinutes();

            if (taskTimeFormat === "AM" && this.#userCurrentHour < 12) {
              if (
                Number(taskStartHour) - this.#userCurrentHour === 1 &&
                this.#userCurrentMinute >= 30
              )
                if (60 - this.#userCurrentMinute <= 30)
                  this._sendNotification(
                    taskHasTimePeriod.task,
                    60 - this.#userCurrentMinute
                  );

              if (
                this.#userCurrentHour === Number(taskStartHour) &&
                this.#userCurrentMinute < 30 &&
                Number(taskStartMinute) === 30
              )
                if (Number(taskStartMinute) - this.#userCurrentMinute <= 30)
                  this._sendNotification(
                    taskHasTimePeriod.task,
                    Number(taskStartMinute) - this.#userCurrentMinute
                  );
            }

            if (taskTimeFormat === "PM" && this.#userCurrentHour >= 12) {
              taskStartHour = Number(taskStartHour) + 12;

              if (
                Number(taskStartHour) - this.#userCurrentHour === 1 &&
                this.#userCurrentMinute >= 30
              )
                if (60 - this.#userCurrentMinute <= 30)
                  this._sendNotification(
                    taskHasTimePeriod.task,
                    60 - this.#userCurrentMinute
                  );

              if (
                this.#userCurrentHour === Number(taskStartHour) &&
                this.#userCurrentMinute < 30 &&
                Number(taskStartMinute) === 30
              )
                if (Number(taskStartMinute) - this.#userCurrentMinute <= 30)
                  this._sendNotification(
                    taskHasTimePeriod.task,
                    Number(taskStartMinute) - this.#userCurrentMinute
                  );
            }

            // It's special state.
            if (
              Number(taskStartHour) === 12 &&
              taskTimeFormat === "PM" &&
              this.#userCurrentHour < 12
            )
              if (60 - this.#userCurrentMinute <= 30)
                this._sendNotification(
                  taskHasTimePeriod,
                  60 - this.#userCurrentMinute
                );
          });
      }
    });
  }

  // Editing the task
  _editTask(e) {
    e.preventDefault();

    const taskInput = this._checkTaskInput(inputEditTask);

    if (taskInput) {
      let task;

      !includeTimeEditPeriod.checked
        ? (task = new Task(this.#currentActivity.activityType, taskInput.value))
        : (task = new Task(
            this.#currentActivity.activityType,
            taskInput.value,
            this._getTimePeriod("edit")
          ));

      const indexOfCurrentTask = this.#currentActivityTasks.findIndex(
        (currentActivityTask) => currentActivityTask === this.#currentTask
      );

      this.#currentActivityTasks[indexOfCurrentTask] = task;

      this._saveTasks();
      this._renderTasks();
      this._clearTimePeriod();
      this._taskChart();
      this._upcomingTask();
    }
  }

  // Creating new tasks
  _addTask(e) {
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

        !includeTimeAddPeriod.checked
          ? (task = new Task(
              this.#currentActivity.activityType,
              taskInput.value
            ))
          : (task = new Task(
              this.#currentActivity.activityType,
              taskInput.value,
              this._getTimePeriod("new")
            ));

        this.#currentActivityTasks.push(task);

        this._saveTasks();
        this._renderTasks();

        tasksCount.textContent = this._calcTasksCount();

        inputAddTask.value = "";

        this._clearTimePeriod();
        this._taskChart();
        this._upcomingTask();
      }
    }
  }

  // Rendering the searched tasks
  _renderSearchedTask(searchedTask) {
    searchedTasks.innerHTML = "";

    searchedTask.value === ""
      ? (searchedTasks.innerHTML = "")
      : this.#currentActivityTasks.forEach((currentActivityTask, index) => {
          if (
            currentActivityTask.task
              .toLowerCase()
              .startsWith(searchedTask.value.toLowerCase()) ||
            currentActivityTask.task
              .toLowerCase()
              .includes(searchedTask.value.toLowerCase())
          ) {
            const html = `
          <div class="task w-100 btn-link rounded shadow p-4 mt-4">
            <span>
              <input
                type="checkbox"
                name="checkbox-task-${index}"
                id="checkbox-task-${index}"
                class="form-check-input"
                ${currentActivityTask.checked ? "checked" : ""}
              />
              <label for="" class="text-primary ms-2">${
                currentActivityTask.task
              }</label>
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

            searchedTasks.insertAdjacentHTML("afterbegin", html);
          }
        });

    this._saveTasks();
    this._renderTasks();
    this._taskChart();
  }

  // Searching tasks by input value
  _searchedTask() {
    const searchedTask = inputSearchTask;

    this._getCurrentActivityTasks();
    this._renderSearchedTask(searchedTask);
  }
}

const app = new App();
