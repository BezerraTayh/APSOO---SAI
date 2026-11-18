
import { useEffect, useState } from "react";

import {
  cancelarAgendamento,
  criarAgendamento,
  listarAgendamentos,
  listarProcedimentos,
  reagendarAgendamento,
} from "../../../api/client";
import { paraAgendamentos } from "../../../api/models";
import "./style.css";

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
  result.setHours(0, 0, 0, 0);

  return result;
}

function dateFromString(value) {
  return new Date(`${value}T12:00:00`);
}

const hours = Array.from({ length: 10 }, (_, i) => i + 8);
const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function MinhaAgenda({ novoAgendamento = 0, onNovoAgendamento = () => {} }) {
  const today = new Date();

  const [view, setView] = useState("Semana");
  const [weekStart, setWeekStart] = useState(mondayOf(today));
  const [selectedDate, setSelectedDate] = useState(localDate(today));
  const [appointments, setAppointments] = useState([]);
  const [procedimentos, setProcedimentos] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    procedure: "",
    phone: "",
    date: localDate(today),
    time: "09:00",
  });

  useEffect(() => {
    if (novoAgendamento > 0) {
      openNewAppointment();
      onNovoAgendamento();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novoAgendamento]);

  useEffect(() => {
    let ativo = true;

    Promise.all([listarProcedimentos(), listarAgendamentos()])
      .then(([procedimentos, agendamentos]) => {
        if (!ativo) return;
        setProcedimentos(procedimentos);
        setAppointments(paraAgendamentos(agendamentos));
      })
      .catch((e) => {
        if (ativo) {
          alert(e.message || "Não foi possível carregar a agenda.");
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const days = Array.from({ length: 5 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const visibleDays =
    view === "Dia"
      ? [dateFromString(selectedDate)]
      : days;

  const monthStart = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    1
  );

  const monthOffset = (monthStart.getDay() + 6) % 7;

  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthStart);
    date.setDate(1 - monthOffset + index);
    return date;
  });

  const firstDay = days[0];
  const lastDay = days[4];

  function appointmentsForDate(date) {
    return appointments.filter(
      (appointment) => appointment.date === localDate(date)
    );
  }

  function procedimentoPorNome(nome) {
    return procedimentos.find(
      (procedimento) =>
        procedimento.nome.trim().toLowerCase() === nome.trim().toLowerCase()
    );
  }

  function telefonePorNome(nome) {
    const agendamento = appointments.find(
      (appointment) =>
        appointment.name.trim().toLowerCase() === nome.trim().toLowerCase() &&
        appointment.telefone
    );
    return agendamento?.telefone;
  }

  function changePeriod(amount) {
    if (view === "Mês") {
      const next = new Date(weekStart);
      next.setMonth(next.getMonth() + amount);

      setWeekStart(
        mondayOf(new Date(next.getFullYear(), next.getMonth(), 1))
      );
      return;
    }

    if (view === "Dia") {
      const next = dateFromString(selectedDate);
      next.setDate(next.getDate() + amount);

      setSelectedDate(localDate(next));
      setWeekStart(mondayOf(next));
      return;
    }

    const next = new Date(weekStart);
    next.setDate(next.getDate() + amount * 7);
    setWeekStart(next);
  }

  function goToday() {
    const currentDate = new Date();

    setSelectedDate(localDate(currentDate));
    setWeekStart(mondayOf(currentDate));
  }

  function openNewAppointment() {
    setEditingId(null);
    setSelectedAppointment(null);

    setForm({
      name: "",
      procedure: "",
      phone: "",
      date: selectedDate,
      time: "09:00",
    });

    setModalOpen(true);
  }

  function openEditAppointment(appointment) {
    setEditingId(appointment.id);
    setSelectedAppointment(null);

    setForm({
      name: appointment.name,
      procedure: appointment.procedure,
      phone: appointment.telefone || "",
      date: appointment.date,
      time: appointment.inicio.slice(11, 16),
    });

    setModalOpen(true);
  }

  async function saveAppointment(event) {
    event.preventDefault();

    if (!form.name.trim() || !form.procedure.trim() || !form.date) {
      alert("Preencha todos os campos.");
      return;
    }

    const [hour, minute] = form.time.split(":").map(Number);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      minute % 30 !== 0 ||
      hour < 8 ||
      hour > 17 ||
      (hour === 17 && minute === 30)
    ) {
      alert("Escolha um horário entre 08:00 e 17:00, de 30 em 30 minutos.");
      return;
    }

    const procedimento = procedimentoPorNome(form.procedure);

    if (!procedimento) {
      alert("Escolha um procedimento cadastrado.");
      return;
    }

    const novoHorario = `${form.date}T${form.time}:00`;
    const antigo = appointments.find(
      (appointment) => appointment.id === editingId
    );

    try {
      if (editingId !== null) {
        if (!antigo) {
          alert("Agendamento não encontrado.");
          return;
        }

        const dadosIguais =
          antigo.name === form.name.trim() &&
          antigo.procedure === form.procedure.trim();

        if (dadosIguais) {
          const atualizado = await reagendarAgendamento(antigo.id, novoHorario);
          const convertido = paraAgendamentos([atualizado])[0];
          setAppointments((current) =>
            current.map((appointment) =>
              appointment.id === antigo.id ? convertido : appointment
            )
          );
        } else {
          await cancelarAgendamento(antigo.id);

          let telefone =
            form.phone.trim() ||
            telefonePorNome(form.name) ||
            antigo.telefone;

          if (!telefone) {
            telefone = window.prompt("Telefone do cliente (WhatsApp)");
          }

          if (!telefone) return;

          const novo = await criarAgendamento({
            procedimentoId: procedimento.id,
            inicio: novoHorario,
            nomeCliente: form.name.trim(),
            telefoneCliente: telefone.trim(),
          });

          const convertido = paraAgendamentos([novo])[0];
          setAppointments((current) => [
            ...current.filter((item) => item.id !== antigo.id),
            convertido,
          ]);
        }
      } else {
        let telefone = form.phone.trim() || telefonePorNome(form.name);

        if (!telefone) {
          telefone = window.prompt("Telefone do cliente (WhatsApp)");
        }

        if (!telefone) return;

        const novo = await criarAgendamento({
          procedimentoId: procedimento.id,
          inicio: novoHorario,
          nomeCliente: form.name.trim(),
          telefoneCliente: telefone.trim(),
        });

        setAppointments((current) => [
          ...current,
          ...paraAgendamentos([novo]),
        ]);
      }

      const newDate = dateFromString(form.date);

      setSelectedDate(form.date);
      setWeekStart(mondayOf(newDate));
      setView("Semana");
      setModalOpen(false);
      setEditingId(null);
    } catch (e) {
      alert(e.message || "Não foi possível salvar o agendamento.");
    }
  }

  async function cancelAppointment() {
    if (!selectedAppointment) return;

    const confirmed = window.confirm(
      `Deseja realmente cancelar o agendamento de ${selectedAppointment.name}?`
    );

    if (!confirmed) return;

    try {
      await cancelarAgendamento(selectedAppointment.id);
      setAppointments((current) =>
        current.filter(
          (appointment) => appointment.id !== selectedAppointment.id
        )
      );
      setSelectedAppointment(null);
    } catch (e) {
      alert(e.message || "Não foi possível cancelar o agendamento.");
    }
  }

  return (
    <section className="agenda-page">
      <header className="agenda-heading">
        <div>
          <h1>Minha agenda</h1>
          <p>Visualize e gerencie seus atendimentos.</p>
        </div>

        <button
          className="agenda-add-button"
          onClick={openNewAppointment}
        >
          <span>＋</span> Adicionar agendamento
        </button>
      </header>

      <section className="agenda-calendar">
        <div className="agenda-toolbar">
          <div className="agenda-view-switch">
            {["Dia", "Semana", "Mês"].map((item) => (
              <button
                key={item}
                className={view === item ? "selected" : ""}
                onClick={() => setView(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="agenda-date-controls">
            <button
              onClick={() => changePeriod(-1)}
              aria-label="Período anterior"
            >
              ‹
            </button>

            <strong>
              {view === "Mês"
                ? weekStart.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })
                : view === "Dia"
                ? dateFromString(selectedDate).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : `${firstDay.getDate()}–${lastDay.getDate()} de ${lastDay.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  })}`}
            </strong>

            <button
              onClick={() => changePeriod(1)}
              aria-label="Próximo período"
            >
              ›
            </button>

            <button className="agenda-today" onClick={goToday}>
              Hoje
            </button>
          </div>
        </div>

        {view === "Mês" ? (
          <div className="agenda-month">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
              (day) => (
                <strong key={day}>{day}</strong>
              )
            )}

            {monthDays.map((date, index) => {
              const dayAppointments = appointmentsForDate(date);
              const isOtherMonth =
                date.getMonth() !== weekStart.getMonth();
              const isSelected = localDate(date) === selectedDate;

              return (
                <button
                  key={index}
                  className={`agenda-month-day ${isOtherMonth ? "other-month" : ""} ${isSelected ? "selected-day" : ""}`}
                  onClick={() => {
                    setSelectedDate(localDate(date));
                    setWeekStart(mondayOf(date));
                    setView("Dia");
                  }}
                >
                  <span>{date.getDate()}</span>

                  {dayAppointments.slice(0, 2).map((appointment) => (
                    <small key={appointment.id}>
                      {appointment.name}
                    </small>
                  ))}

                  {dayAppointments.length > 2 && (
                    <small>+{dayAppointments.length - 2} mais</small>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="agenda-grid">
            <div
              className="agenda-grid-header"
              style={{
                gridTemplateColumns: `55px repeat(${visibleDays.length}, minmax(110px, 1fr))`,
              }}
            >
              <div className="agenda-time-heading" />

              {visibleDays.map((date) => (
                <div
                  className="agenda-day-heading"
                  key={localDate(date)}
                >
                  <small>{weekdays[date.getDay()]}</small>
                  <strong>{date.getDate()}</strong>
                </div>
              ))}
            </div>

            <div
              className="agenda-grid-body"
              style={{
                gridTemplateColumns: `55px repeat(${visibleDays.length}, minmax(110px, 1fr))`,
              }}
            >
              <div className="agenda-time-column">
                {hours.map((hour) => (
                  <div key={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {visibleDays.map((date) => (
                <div
                  className="agenda-day-column"
                  key={localDate(date)}
                >
                  {hours.map((hour) => (
                    <div className="agenda-hour-cell" key={hour} />
                  ))}

                  {appointmentsForDate(date).map((appointment) => (
                    <button
                      key={appointment.id}
                      className={`agenda-event event-${appointment.color}`}
                      style={{
                        top: `${(appointment.start - 8) * 54 + 5}px`,
                        height: `${appointment.duration * 54 - 8}px`,
                      }}
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <strong>{appointment.name}</strong>
                      <span>{appointment.procedure}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {selectedAppointment && (
        <div
          className="agenda-modal-backdrop"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="agenda-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="agenda-modal-close"
              onClick={() => setSelectedAppointment(null)}
            >
              ×
            </button>

            <h2>Detalhes do agendamento</h2>

            <h3>{selectedAppointment.name}</h3>
            <p>{selectedAppointment.procedure}</p>

            <p>
              Data:{" "}
              {dateFromString(selectedAppointment.date).toLocaleDateString(
                "pt-BR"
              )}
            </p>

            <p>
              Horário:{" "}
              {selectedAppointment.inicio.slice(11, 16)}
            </p>

            <button
              className="agenda-modal-primary"
              type="button"
              onClick={() => openEditAppointment(selectedAppointment)}
            >
              Editar / Reagendar
            </button>

            <button
              className="agenda-modal-primary"
              type="button"
              onClick={cancelAppointment}
            >
              Cancelar agendamento
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="agenda-modal-backdrop"
          onClick={() => {
            setModalOpen(false);
            setEditingId(null);
          }}
        >
          <form
            className="agenda-modal"
            onSubmit={saveAppointment}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="agenda-modal-close"
              onClick={() => {
                setModalOpen(false);
                setEditingId(null);
              }}
            >
              ×
            </button>

            <h2>
              {editingId !== null
                ? "Editar agendamento"
                : "Novo agendamento"}
            </h2>

            <label>Nome do cliente</label>
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Digite o nome do cliente"
            />

            <label>Procedimento</label>
            <input
              required
              value={form.procedure}
              list="agenda-procedimentos"
              onChange={(event) =>
                setForm({ ...form, procedure: event.target.value })
              }
              placeholder="Ex.: Design de sobrancelhas"
            />

            <datalist id="agenda-procedimentos">
              {procedimentos.map((procedimento) => (
                <option key={procedimento.id} value={procedimento.nome} />
              ))}
            </datalist>

            <label>WhatsApp</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                setForm({ ...form, phone: event.target.value })
              }
              placeholder="(00) 00000-0000"
            />

            <label>Data</label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({ ...form, date: event.target.value })
              }
            />

            <label>Horário</label>
            <input
              required
              type="time"
              min="08:00"
              max="17:00"
              value={form.time}
              onChange={(event) =>
                setForm({ ...form, time: event.target.value })
              }
            />

            <button
              className="agenda-modal-primary"
              type="submit"
            >
              {editingId !== null
                ? "Salvar alterações"
                : "Salvar agendamento"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
