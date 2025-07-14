// main.js
const $ = document.querySelector.bind(document)
const $$ = document.querySelectorAll.bind(document)

const addBtn = $(".add-btn")
const addTaskModal = $("#addTaskModal")
const modalCloseBtn = $(".modal-close")
const btnCancel = $(".btn-cancel")
const todoForm = $(".todo-app-form")
const todoList = $("#todoList")
const titleInput = $("#taskTitle")
const searchInput = $(".search-input")
const toastContainer = $("#toast-container")
const elementModalOverlay = $(".modal-overlay")
const tasksAPI = "http://localhost:3000/tasks"


let currentEditId = null

function escapeHTML(html) {
    const div = document.createElement("div")
    div.textContent = html
    return div.innerHTML
}

function popupToast(success) {
    const toast = document.createElement("div")
    const icon = document.createElement("i")

    toast.classList.add("toast", success ? "success" : "error")
    icon.classList.add(
        "icon",
        "fa-solid",
        "fa-2xl",
        success ? "fa-circle-check" : "fa-circle-xmark"
    )

    toast.innerText = success ? "Thành công!" : "Thất bại!"
    toast.appendChild(icon)
    toastContainer.appendChild(toast)

    setTimeout(() => toast.remove(), 3500)
}

function openModal() {
    addTaskModal.classList.add("show")
    setTimeout(() => titleInput.focus(), 100)
}

function closeModal() {
    addTaskModal.classList.remove("show")
    todoForm.reset()
    currentEditId = null
}

addBtn.onclick = openModal
modalCloseBtn.onclick = closeModal
btnCancel.onclick = closeModal

elementModalOverlay.onclick = (e) => {
    if (e.target === elementModalOverlay) closeModal()
}

async function fetchTasks() {
    const res = await fetch(tasksAPI)
    return await res.json()
}

async function renderTasks(tasks = null) {
    const data = tasks || (await fetchTasks())

    if (!data.length) {
        todoList.innerHTML = "<p>Chưa có tasks</p>"
        return
    }

    todoList.innerHTML = data
        .map(
            (task) => `
    <div class="task-card ${escapeHTML(task.color)} ${
                task.isCompleted ? "completed" : ""
            }">
      <div class="task-header">
        <h3 class="task-title">${escapeHTML(task.title)}</h3>
        <button class="task-menu">
          <i class="fa-solid fa-ellipsis fa-icon"></i>
          <div class="dropdown-menu">
            <div class="dropdown-item edit-btn" data-id="${task.id}">
              <i class="fa-solid fa-pen-to-square fa-icon"></i> Edit
            </div>
            <div class="dropdown-item complete-btn" data-id="${
                task.id
            }" data-completed="${task.isCompleted}">
              <i class="fa-solid fa-check fa-icon"></i>
              ${task.isCompleted ? "Mark as Active" : "Mark as Complete"}
            </div>
            <div class="dropdown-item delete delete-btn" data-id="${task.id}">
              <i class="fa-solid fa-trash fa-icon"></i> Delete
            </div>
          </div>
        </button>
      </div>
      <p class="task-description">${escapeHTML(task.description)}</p>
      <div class="task-time">${escapeHTML(task.startTime)} - ${escapeHTML(
                task.endTime
            )}</div>
    </div>
  `
        )
        .join("")
}

todoForm.onsubmit = async (e) => {
    e.preventDefault()
    const formData = Object.fromEntries(new FormData(todoForm))

    if (!formData.title.trim()) {
        popupToast(false)
        return
    }

    const tasks = await fetchTasks()
    const duplicate = tasks.some(
        (t) =>
            t.title.toLowerCase() === formData.title.toLowerCase() &&
            t.id !== currentEditId
    )
    if (duplicate) {
        alert("Task đã tồn tại!")
        popupToast(false)
        return
    }

    formData.isCompleted = false

    try {
        if (currentEditId) {
            await fetch(`${tasksAPI}/${currentEditId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
        } else {
            await fetch(tasksAPI, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })
        }
        popupToast(true)
        closeModal()
        renderTasks()
    } catch (err) {
        console.error(err)
        popupToast(false)
    }
}

todoList.onclick = async (e) => {
    const editBtn = e.target.closest(".edit-btn")
    const deleteBtn = e.target.closest(".delete-btn")
    const completeBtn = e.target.closest(".complete-btn")

    if (editBtn) {
        const id = editBtn.dataset.id
        const task = await fetch(`${tasksAPI}/${id}`).then((res) => res.json())
        currentEditId = id

        for (const key in task) {
            const input = $(`[name="${key}"]`)
            if (input) input.value = task[key]
        }
        openModal()
    }

    if (deleteBtn) {
        const id = deleteBtn.dataset.id
        if (confirm("Bạn có chắc muốn xóa?")) {
            await fetch(`${tasksAPI}/${id}`, { method: "DELETE" })
            renderTasks()
        }
    }

    if (completeBtn) {
        const id = completeBtn.dataset.id
        const isCompleted = completeBtn.dataset.completed === "true"
        await fetch(`${tasksAPI}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isCompleted: !isCompleted }),
        })
        renderTasks()
    }
}

searchInput.oninput = async function (e) {
    const keyword = e.target.value.trim().toLowerCase()
    const tasks = await fetchTasks()

    if (!keyword) {
        renderTasks(tasks)
        return
    }

    const filtered = tasks.filter(
        (task) =>
            task.title.toLowerCase().includes(keyword) ||
            (task.description && task.description.toLowerCase().includes(keyword))
    )
    renderTasks(filtered)
}

renderTasks()
