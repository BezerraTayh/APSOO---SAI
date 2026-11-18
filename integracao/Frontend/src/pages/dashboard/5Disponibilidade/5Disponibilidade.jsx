
import { useEffect, useState } from "react";

import {
  cancelarAgendamento,
  criarBloqueio,
  listarTodosAgendamentos,
  listarBloqueios,
  listarDisponibilidades,
  removerBloqueio,
  substituirDisponibilidades,
} from "../../../api/client";
import {
  dataLocalAtual,
  deBloqueioForm,
  deDias,
  paraAgendamentos,
  paraBloqueio,
  paraDias,
} from "../../../api/models";
import "./style.css";

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const hour = String(Math.floor(i / 4)).padStart(2, "0");
  const minute = String((i % 4) * 15).padStart(2, "0");
  return `${hour}:${minute}`;
});

const WORK = { start: "09:00", end: "18:00" };

const EMPTY_FORM = {
  date: dataLocalAtual(),
  allDay: true,
  start: "14:00",
  end: "16:00",
  reason: "",
};

const formatDate = (date) => {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

function Modal({ children, onClose }) {
  return (
    <div className="box__overlay" onMouseDown={onClose}>
      <div className="box__modal" onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function Disponibilidade() {
  const [days, setDays] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [carregando, setCarregando] = useState(true);
  const [picker, setPicker] = useState(null);
  const [pickerValue, setPickerValue] = useState("");

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockConflict, setBlockConflict] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [disableDay, setDisableDay] = useState(null);
  const [disableChoice, setDisableChoice] = useState("keep");

  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      listarDisponibilidades(),
      listarBloqueios(),
      listarTodosAgendamentos(),
    ])
      .then(([disponibilidades, bloqueios, agendamentos]) => {
        if (!ativo) return;

        setDays(paraDias(disponibilidades));
        setBlocks(bloqueios.map(paraBloqueio));
        setAppointments(paraAgendamentos(agendamentos));
        setCarregando(false);
      })
      .catch((e) => {
        if (!ativo) return;
        showToast(e.message || "Não foi possível carregar a disponibilidade.");
        setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setPicker(null);
        setBlockOpen(false);
        setBlockConflict(false);
        setDisableDay(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function showToast(message) {
    setToast(message);
  }

  function getAppointmentsForDay(dayIndex) {
    return appointments.filter((appointment) => {
      const date = new Date(`${appointment.date}T00:00:00`);
      return date.getDay() === dayIndex;
    });
  }

  function toggleDay(index) {
    const day = days[index];

    if (day.on) {
      const booked = getAppointmentsForDay(index);

      if (booked.length > 0) {
        setDisableDay(index);
        setDisableChoice("keep");
        return;
      }
    }

    setDays((current) =>
      current.map((item, i) =>
        i === index ? { ...item, on: !item.on } : item
      )
    );
  }

  async function confirmDisableDay() {
    if (disableDay === null) return;

    try {
      if (disableChoice === "cancel") {
        const conflitos = getAppointmentsForDay(disableDay);
        await Promise.all(
          conflitos.map((agendamento) => cancelarAgendamento(agendamento.id))
        );
        setAppointments((current) =>
          current.filter(
            (agendamento) => !conflitos.some((item) => item.id === agendamento.id)
          )
        );
      }

      const proximos = days.map((day, index) =>
        index === disableDay ? { ...day, on: false } : day
      );
      const grade = await substituirDisponibilidades(deDias(proximos));
      setDays(paraDias(grade));

      setDisableDay(null);
      showToast("Horário atualizado com sucesso!");
    } catch (e) {
      showToast(e.message || "Não foi possível atualizar o horário.");
    }
  }

  function addInterval(dayIndex) {
    setDays((current) =>
      current.map((day, index) => {
        if (index !== dayIndex || day.intervals.length >= 2) return day;

        return {
          ...day,
          intervals: [
            ...day.intervals,
            { start: "14:00", end: "18:00" },
          ],
        };
      })
    );
  }

  function removeInterval(dayIndex) {
    setDays((current) =>
      current.map((day, index) =>
        index === dayIndex && day.intervals.length > 1
          ? { ...day, intervals: day.intervals.slice(0, 1) }
          : day
      )
    );
  }

  function openPicker(dayIndex, intervalIndex, field, value) {
    setPicker({ dayIndex, intervalIndex, field });
    setPickerValue(value);
  }

  function applyPicker() {
    if (!picker) return;

    setDays((current) =>
      current.map((day, dayIndex) => {
        if (dayIndex !== picker.dayIndex) return day;

        return {
          ...day,
          intervals: day.intervals.map((interval, intervalIndex) =>
            intervalIndex === picker.intervalIndex
              ? { ...interval, [picker.field]: pickerValue }
              : interval
          ),
        };
      })
    );

    setPicker(null);
  }

  async function saveSchedule() {
    for (const day of days) {
      if (!day.on) continue;

      for (const interval of day.intervals) {
        if (
          !interval.start ||
          !interval.end ||
          timeToMinutes(interval.start) >= timeToMinutes(interval.end)
        ) {
          showToast("Confira os horários antes de salvar.");
          return;
        }
      }

      if (day.intervals.length === 2) {
        const first = day.intervals[0];
        const second = day.intervals[1];

        if (timeToMinutes(first.end) > timeToMinutes(second.start)) {
          showToast("Os intervalos não podem se sobrepor.");
          return;
        }
      }
    }

    try {
      const grade = await substituirDisponibilidades(deDias(days));
      setDays(paraDias(grade));
      showToast("Horários salvos com sucesso!");
    } catch (e) {
      showToast(e.message || "Não foi possível salvar os horários.");
    }
  }

  function openBlock() {
    setForm(EMPTY_FORM);
    setFormError("");
    setBlockOpen(true);
  }

  function closeBlock() {
    setBlockOpen(false);
    setBlockConflict(false);
    setFormError("");
  }

  function getConflictingAppointments() {
    return appointments.filter((appointment) => {
      if (appointment.date !== form.date) return false;
      if (form.allDay) return true;

      return (
        timeToMinutes(appointment.start) < timeToMinutes(form.end) &&
        timeToMinutes(appointment.end) > timeToMinutes(form.start)
      );
    });
  }

  function submitBlock(event) {
    event.preventDefault();
    setFormError("");

    if (!form.date || !form.reason.trim()) {
      setFormError("Preencha a data e o motivo do bloqueio.");
      return;
    }

    if (
      !form.allDay &&
      timeToMinutes(form.start) >= timeToMinutes(form.end)
    ) {
      setFormError("O horário final deve ser depois do horário inicial.");
      return;
    }

    const conflict = getConflictingAppointments();

    if (conflict.length > 0) {
      setBlockOpen(false);
      setBlockConflict(true);
      return;
    }

    saveBlock(false);
  }

  async function saveBlock(cancelAppointments) {
    try {
      const salvo = await criarBloqueio({
        ...deBloqueioForm(form),
        cancelarAgendamentos: cancelAppointments,
      });
      const bloqueio = paraBloqueio(salvo);

      setBlocks((current) => [...current, bloqueio]);
      setBlockOpen(false);
      setBlockConflict(false);
      showToast("Horário bloqueado com sucesso!");
    } catch (e) {
      setBlockOpen(false);
      setBlockConflict(false);
      showToast(e.message || "Não foi possível bloquear o horário.");
    }
  }

  async function removeBlock(id) {
    try {
      await removerBloqueio(id);
      setBlocks((current) => current.filter((block) => block.id !== id));
      showToast("Bloqueio removido.");
    } catch (e) {
      showToast(e.message || "Não foi possível remover o bloqueio.");
    }
  }

  return (
    <main className="box">
      <section className="box__content">
        <header className="box__header">
          <div>
            <h1 className="box__title">Disponibilidade</h1>
            <p className="box__subtitle">
              Defina quando você atende e bloqueie exceções.
            </p>
          </div>

          <button className="box__button" onClick={openBlock}>
            Bloquear horário
          </button>
        </header>

        <div className="box__grid">
          <section className="box__card">
            <h2 className="box__card-title">Horários de trabalho</h2>

            {days.map((day, dayIndex) => (
              <div className="box__day" key={day.label}>
                <span className="box__day-name">{day.label}</span>

                <div className="box__day-controls">
                  <button
                    type="button"
                    className={`box__switch ${
                      day.on ? "box__switch--on" : ""
                    }`}
                    aria-label={`${
                      day.on ? "Desativar" : "Ativar"
                    } ${day.label}`}
                    aria-pressed={day.on}
                    onClick={() => toggleDay(dayIndex)}
                  />

                  {day.on ? (
                    <>
                      {day.intervals.map((interval, intervalIndex) => (
                        <div
                          key={intervalIndex}
                          className="box__day-controls"
                        >
                          <button
                            className="box__time"
                            onClick={() =>
                              openPicker(
                                dayIndex,
                                intervalIndex,
                                "start",
                                interval.start
                              )
                            }
                          >
                            {interval.start}
                          </button>

                          <span className="box__subtitle">até</span>

                          <button
                            className="box__time"
                            onClick={() =>
                              openPicker(
                                dayIndex,
                                intervalIndex,
                                "end",
                                interval.end
                              )
                            }
                          >
                            {interval.end}
                          </button>
                        </div>
                      ))}

                      {day.intervals.length === 1 ? (
                        <button
                          className="box__add"
                          title="Adicionar intervalo"
                          onClick={() => addInterval(dayIndex)}
                        >
                          +
                        </button>
                      ) : (
                        <button
                          className="box__remove"
                          title="Remover segundo intervalo"
                          onClick={() => removeInterval(dayIndex)}
                        >
                          −
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="box__subtitle">Não atende</span>
                  )}
                </div>
              </div>
            ))}

            <div className="box__save">
              <button className="box__button" onClick={saveSchedule}>
                Salvar alterações
              </button>
            </div>
          </section>

          <div className="box__side">
            <section className="box__card">
              <h2 className="box__card-title">Bloqueios futuros</h2>

              {blocks.length === 0 ? (
                <p className="box__subtitle">
                  Nenhum bloqueio cadastrado.
                </p>
              ) : (
                blocks.map((block) => (
                  <div className="box__block-item" key={block.id}>
                    <div>
                      <strong>{block.reason}</strong>
                      <div className="box__block-date">
                        {formatDate(block.date)} ·{" "}
                        {block.allDay
                          ? "Dia inteiro"
                          : `${block.start} – ${block.end}`}
                      </div>
                    </div>

                    <button
                      className="box__remove"
                      title="Remover bloqueio"
                      onClick={() => removeBlock(block.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </section>

            <div className="box__warning">
              <strong>Atenção aos agendamentos</strong>
              <p>
                Ao bloquear um horário, confira se existem atendimentos
                marcados nesse período para evitar conflitos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {picker && (
        <div className="box__overlay" onMouseDown={() => setPicker(null)}>
          <div
            className="box__picker"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="box__modal-title">Selecionar horário</h2>

            <p className="box__modal-subtitle">
              {days[picker.dayIndex].label} ·{" "}
              {picker.field === "start" ? "Entrada" : "Saída"}
            </p>

            <input
              className="box__time"
              type="time"
              value={pickerValue}
              onChange={(event) => setPickerValue(event.target.value)}
            />

            <div className="box__picker-grid">
              {TIMES.map((time) => (
                <button
                  key={time}
                  className={`box__picker-time ${
                    pickerValue === time
                      ? "box__picker-time--selected"
                      : ""
                  }`}
                  onClick={() => setPickerValue(time)}
                >
                  {time}
                </button>
              ))}
            </div>

            <div className="box__modal-actions">
              <button
                className="box__button box__button--secondary"
                onClick={() => setPicker(null)}
              >
                Voltar
              </button>

              <button className="box__button" onClick={applyPicker}>
                Aplicar horário
              </button>
            </div>
          </div>
        </div>
      )}

      {blockOpen && (
        <Modal onClose={closeBlock}>
          <h2 className="box__modal-title">Bloquear horário</h2>

          <p className="box__modal-subtitle">
            Escolha um dia ou período em que não estará disponível.
          </p>

          <form onSubmit={submitBlock}>
            <div className="box__field">
              <label>Tipo de bloqueio</label>

              <select
                value={form.allDay ? "allDay" : "specific"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    allDay: event.target.value === "allDay",
                  }))
                }
              >
                <option value="allDay">Dia inteiro</option>
                <option value="specific">Horário específico</option>
              </select>
            </div>

            <div className="box__field">
              <label>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </div>

            {!form.allDay && (
              <>
                <div className="box__field">
                  <label>Início</label>
                  <input
                    type="time"
                    value={form.start}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        start: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="box__field">
                  <label>Fim</label>
                  <input
                    type="time"
                    value={form.end}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        end: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className="box__field">
              <label>Motivo</label>
              <input
                type="text"
                placeholder="Ex.: Folga pessoal"
                value={form.reason}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
              />
            </div>

            {formError && <p className="box__subtitle">{formError}</p>}

            <div className="box__modal-actions">
              <button
                type="button"
                className="box__button box__button--secondary"
                onClick={closeBlock}
              >
                Cancelar
              </button>

              <button type="submit" className="box__button">
                Bloquear horário
              </button>
            </div>
          </form>
        </Modal>
      )}

      {blockConflict && (
        <Modal onClose={() => setBlockConflict(false)}>
          <h2 className="box__modal-title">Conflito de agendamento</h2>

          <p className="box__modal-subtitle">
            Existem atendimentos agendados nesse período. Deseja cancelar
            esses atendimentos e continuar com o bloqueio?
          </p>

          <div className="box__modal-actions">
            <button
              className="box__button box__button--secondary"
              onClick={() => setBlockConflict(false)}
            >
              Não bloquear
            </button>

            <button
              className="box__button box__button--danger"
              onClick={() => saveBlock(true)}
            >
              Cancelar atendimento e bloquear
            </button>
          </div>
        </Modal>
      )}

      {disableDay !== null && (
        <Modal onClose={() => setDisableDay(null)}>
          <h2 className="box__modal-title">
            Desativar dia com agendamentos
          </h2>

          <p className="box__modal-subtitle">
            Existem atendimentos cadastrados para {days[disableDay].label}.
            Como deseja continuar?
          </p>

          <div className="box__field">
            <label>
              <input
                type="radio"
                name="disableChoice"
                checked={disableChoice === "keep"}
                onChange={() => setDisableChoice("keep")}
              />
              {" "}Manter os agendamentos existentes
            </label>

            <label>
              <input
                type="radio"
                name="disableChoice"
                checked={disableChoice === "cancel"}
                onChange={() => setDisableChoice("cancel")}
              />
              {" "}Cancelar os agendamentos existentes
            </label>
          </div>

          <div className="box__modal-actions">
            <button
              className="box__button box__button--secondary"
              onClick={() => setDisableDay(null)}
            >
              Voltar
            </button>

            <button className="box__button" onClick={confirmDisableDay}>
              Confirmar
            </button>
          </div>
        </Modal>
      )}

      {toast && <div className="box__toast">{toast}</div>}
    </main>
  );
}
