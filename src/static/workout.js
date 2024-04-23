"use strict";

import {
  fixContentLength,
  addEventListenersToContents,
  capitalizeWords,
  msgAnim,
} from "./contentManager.js";
import {
  fetchExerciseByID,
  fetchExercises,
  fetchWorkoutByID,
  editData,
  putWorkout,
} from "./dataHandler.js";

const urlParams = new URLSearchParams(window.location.search);
const workoutParam = urlParams.get("workout");
const darkenBg = document.querySelector(".darken-background");
const popupWrapper = document.querySelector("#popup-wrapper");
const popupName = document.querySelector(".popup-name");
const workoutName = document.querySelector(".nav-header");
const title = document.querySelector("title");
let workoutCon = document.querySelector("#workout-content");
const startBtn = document.querySelector("#start");
const editBtn = document.querySelector("#edit");
const addExerciseBtn = document.querySelector("#add-exercise");
const pauseBtn = document.querySelector("#pause");

let editMode = false;

//#region Initialize Webpage

if (workoutParam) {
  const nameInput = document.querySelector("#name-input");
  popupName.style.display = "none";
  darkenBg.classList.add("hidden");

  localStorage.setItem("pageIndex", 1);

  fetchExercises()
    .then((exercises) => {
      exercises.forEach((exercise) => {
        const gridExerciseElem = new GridExercise(exercise);
        gridExerciseElem.render();
      });
      const childList = document.querySelectorAll(".child");
      fixContentLength(childList);
    })
    .catch((error) => {
      console.error("Error fetching exercise data:", error);
    });

  fetchWorkoutByID(workoutParam)
    .then((data) => {
      const editedName = capitalizeWords(data.name.split(/-/));
      workoutName.textContent = editedName;
      title.textContent = editedName;

      if (data.exercise_list != null) {
        for (let i = 0; i < data.exercise_list.length; i++) {
          fetchExerciseByID(data.exercise_list[i]).then((exerciseData) => {
            const dataObj = exerciseData;
            dataObj.restTime = data.rest_time_list[i];
            const workoutExerciseElem = new WorkoutExercise(exerciseData);
            workoutExerciseElem.render();
          });   
        }
       } else {
        popupName.style.display = "flex";
        darkenBg.classList.remove("hidden");
      }
    })
    .catch((error) => {
      console.error("Error fetching workout data:", error);
    });
  addEventListenersToContents(nameInput);
  addEventListenersToContents(addExerciseBtn);
  addEventListenersToContents(darkenBg);
  addEventListenersToContents(editBtn);
  addEventListenersToContents(startBtn);
  addEventListenersToContents(pauseBtn);
}

//#endregion

//#region Popup Exercise

class GridExercise {
  constructor(data) {
    this.data = data;
    this.node = null;
  }
  render() {
    this.node = editData(this.data, "exercise");
    this.addExerciseToWorkout();
  }
  addExerciseToWorkout() {
    this.node.addEventListener("click", () => {
      fetchExerciseByID(this.data.name).then((data) => {
        msgAnim("Exercise added!");
        const workoutExerciseElem = new WorkoutExercise(data);
        workoutExerciseElem.render();
        saveExercises();
      });
    });
  }
}

//#endregion

//#region Workout Exercise

class WorkoutExercise {
  static elems = [];
  static dropdownIcons = ["fa-angle-down", "fa-angle-left"];

  constructor(data) {
    this.isOpen = false;
    this.data = data;
    this.node = null;
    this.buttonMode = null;
    this.mainContent = null;
    this.extendableContent = null;
    this.iconCon = null;
    this.icon = null;
    this.increaseRest = null;
    this.lowerRest = null;
    this.originalRestTime = null;
    this.restTime = null;
    this.deleteBtn = null;
    this.dropdownBtn = null;
    this.durationNode = null;
    this.originalDuration = null;
    this.duration = null;
    this.isFinished = false;
    this.counter = 0;
  }

  render() {
    this.node = editData(this.data, "workout-exercise");
    this.iconCon = this.node.querySelector(".icon-container");
    this.icon = this.iconCon.querySelector("i");
    this.mainContent = this.node.firstChild;
    this.extendableContent = this.node.querySelector("#extendable-content");
    this.restTime = this.extendableContent.querySelector(".restDuration");
    this.increaseRest = this.extendableContent.querySelector(".fa-plus");
    this.lowerRest = this.extendableContent.querySelector(".fa-minus");
    this.durationNode = this.node.querySelector("span");
    this.duration = this.durationNode.textContent;
    this.originalDuration = parseInt(this.duration, 10);
    this.originalRestTime = parseInt(this.restTime.textContent, 10);
    WorkoutExercise.elems.push(this);
    this.handleButton();
    this.handleRestTime();
    handleStartBtn();
  }

  handleButton() {
    this.iconCon.addEventListener("click", () => {
      this.buttonMode = this.detectButton();
      if (WorkoutExercise.dropdownIcons.includes(this.buttonMode)) {
        this.handleContentSize();
      } else {
        this.deleteExercise();
      }
    });
  }

  detectButton() {
    return this.iconCon.querySelector("i").classList[1];
  }

  handleContentSize() {
    if (!this.isOpen) {
      this.isOpen = true;
      this.extendContent();
    } else {
      this.isOpen = false;
      this.shortenContent();
    }
  }

  extendContent() {
    this.extendableContent.style.display = "block";
    this.icon.classList.remove("fa-angle-left");
    this.icon.classList.add("fa-angle-down");
    this.mainContent.style.height = "22.5vh";
    this.mainContent.firstChild.style.display = "block";
    this.mainContent.firstChild.firstChild.style.height = "70%";
  }

  shortenContent() {
    this.extendableContent.style.display = "none";
    this.icon.classList.remove("fa-angle-down");
    this.icon.classList.add("fa-angle-left");
    this.mainContent.style.height = "10vh";
    this.mainContent.firstChild.style.display = "flex";
    this.mainContent.firstChild.firstChild.style.height = "10vh";
  }

  deleteExercise() {
    this.node.remove();
    WorkoutExercise.removeFromElems(this.node);
    msgAnim("Exercise deleted!");
    saveExercises();
  }

  getIconClass() {
    return this.icon.classList[1];
  }

  countdown() {
    let currentDuration = parseInt(this.durationNode.textContent, 10);
    if (currentDuration > 0) {
      currentDuration -= 1;
      this.durationNode.textContent = currentDuration + "s";
    
    } else {

      let currentRestDuration = parseInt(this.restTime.textContent, 10);
      
      if (currentRestDuration > 0) {
        currentRestDuration -= 1;
        this.restTime.textContent = currentRestDuration + "s";

      } else {
        this.node.style.display = "none";
        this.durationNode.textContent = this.duration;
        this.isFinished = true;
        timer.findExercise();
      }
    }
  }

  handleRestTime() {
    let currentRestTime = parseInt(this.restTime.textContent, 10);
    this.lowerRest.addEventListener("click", () => {
      if (currentRestTime > 0) {
        currentRestTime -= 1;
        this.originalRestTime = currentRestTime;
        this.restTime.textContent = currentRestTime + "s";
        saveExercises();
      }
    });
    this.increaseRest.addEventListener("click", () => {
      if (currentRestTime < 10) {
        currentRestTime += 1;
        this.originalRestTime = currentRestTime;
        this.restTime.textContent = currentRestTime + "s";
        saveExercises();
      }
    });
  }

  static startWorkout() {
    for (let i = 0; i < this.elems.length; i++) { 
      this.elems[i].increaseRest.style.display = "none";
      this.elems[i].lowerRest.style.display = "none";
      this.elems[i].restTime.style.width = "100%";
    }
  }

  static stopWorkout() {
    for (let i = 0; i < this.elems.length; i++) { 
      this.elems[i].node.style.display = "block";
      this.elems[i].durationNode.textContent = this.elems[i].originalDuration + "s";
      this.elems[i].restTime.textContent = this.elems[i].originalRestTime + "s";
      this.elems[i].increaseRest.style.display = "var(--fa-display, inline-block)";
      this.elems[i].lowerRest.style.display = "var(--fa-display, inline-block)";
      this.elems[i].restTime.style.width = "60%";
      this.elems[i].isSelected = true;
      if (this.elems[0] !== this.elems[i]) {
        this.elems[i].isOpen = true;
        this.elems[i].handleContentSize();
      }
    }
  }

  static handleDeleteBtns() {
    const elemList = WorkoutExercise.elems;
    if (elemList.length > 0) {
      if (editMode) {
        elemList.forEach((child) => {
          child.icon.classList.remove(child.getIconClass());
          child.icon.classList.add("fa-trash");
        });
      } else {
        elemList.forEach((child) => {
          child.icon.classList.remove("fa-trash");
          child.isOpen = !child.isOpen;
          child.handleContentSize();
        });
      }
    }
  }

  static removeFromElems(elem) {
    let index = WorkoutExercise.elems.indexOf(elem);
    WorkoutExercise.elems.splice(index, 1);
  }
}

//#endregion

//#region Timer

class Timer {
  constructor() {
    this.node = document.querySelector("#timer");
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isActive = false;
    this.selectedNode = null;
    this.isPaused = false;
  }
  
  handleWorkoutSession() {
    if (!this.isActive) {
      this.startSession();
    } else {
      this.stopSession();
    }
  }

  startSession() {
    this.node.classList.remove("hidden");
    this.isActive = true;
    this.findExercise();
    this.startWatch();
    this.handleBtns();
  }

  stopSession() {
    this.node.classList.add("hidden");
    this.isActive = false;
    this.stopWatch();
    this.handleBtns();
  }

  handlePause() {
    if (this.isPaused) {
      clearInterval(this.timerInterval); 
      this.timerInterval = null; 
    } else {
      this.startWatch();
    }
  }

  startWatch() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval); 
    }
    this.startTime = Date.now() - this.elapsedTime;
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.node.textContent = this.timeToString(this.elapsedTime);
      this.selectedNode.countdown();
    }, 1000);
  }

  stopWatch() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.elapsedTime = 0;
    this.node.textContent = "00:00"; 
  }

  handleBtns() {
    if (this.isActive) {
      editBtn.style.display = "none";
      addExerciseBtn.style.display = "none";
      pauseBtn.style.display = "var(--fa-display, inline-block)";
    } else {
      editBtn.style.display = "var(--fa-display, inline-block)";
      addExerciseBtn.style.display = "var(--fa-display, inline-block)";
      pauseBtn.style.display = "none";
    }
  }

  timeToString(time) {
    let diffInMin = time / 60000;
    let min = Math.floor(diffInMin);

    let diffInSec = (diffInMin - min) * 60;
    let sec = Math.floor(diffInSec);

    let formattedMin = min.toString().padStart(2, "0");
    let formattedSec = sec.toString().padStart(2, "0");

    return `${formattedMin}:${formattedSec}`;
  }

  findExercise(){
    for (let i = 0; i < WorkoutExercise.elems.length; i++) {
      if (WorkoutExercise.elems[i].isFinished === false) {
        WorkoutExercise.elems[i].isOpen = false;
        WorkoutExercise.elems[i].isSelected = true;
        WorkoutExercise.elems[i].handleContentSize();
        this.selectedNode = WorkoutExercise.elems[i];
        break;
      }
    }
  }
}

//#endregion

//#region Additional Functions

function saveExercises() {
  workoutCon = document.querySelector("#workout-content");
  const workoutText = workoutName.textContent;
  const id = workoutParam;
  const exerciseList = [];
  const restTimeList = [];

  for (let i = 0; i < WorkoutExercise.elems.length; i++) {
    const exercise = WorkoutExercise.elems[i].node.id;
    const restTime = WorkoutExercise.elems[i].originalRestTime;
    exerciseList.push(exercise);
    restTimeList.push(restTime);
  };

  handleStartBtn();
  putWorkout(id, "update", workoutText, exerciseList, restTimeList);
}

export function handleAddExerciseBtn() {
  darkenBg.classList.remove("hidden");
  popupWrapper.classList.remove("hidden");
  editMode = false;
  WorkoutExercise.handleDeleteBtns();
}

export function handleEditBtn() {
  if (!editMode) {
    editMode = true;
    WorkoutExercise.handleDeleteBtns();
  } else {
    editMode = false;
    WorkoutExercise.handleDeleteBtns();
  }
}

export function handleStartBtn() {
  if (WorkoutExercise.elems.length > 0) {
    return startBtn.classList.remove("hidden");
  }
  startBtn.classList.add("hidden");
}

const timer = new Timer();

export function startWorkoutSession(event) {
  if (!timer.isActive) {
    event.target.textContent = "Finish";
    WorkoutExercise.startWorkout();
  } else {
    event.target.textContent = "Start";
    WorkoutExercise.stopWorkout();
  }
  timer.handleWorkoutSession();
}

export function pauseWorkoutSession(event) {
  if (!timer.isPaused) {
    event.target.classList.remove("fa-pause");
    event.target.classList.add("fa-play");
    timer.isPaused = true;
  } else {
    event.target.classList.remove("fa-play");
    event.target.classList.add("fa-pause");
    timer.isPaused = false;
  }
  timer.handlePause();
}

//#endregion

export { popupWrapper, workoutName, title, workoutParam };
