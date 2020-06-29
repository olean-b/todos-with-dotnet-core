using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Todos.Data;
using Todos.Models;

namespace Todos.Controllers
{
	[Route("api/[controller]")]
	[ApiController]
	public class TodoController : Controller
	{
		private readonly TodoContext _context;

		public TodoController(TodoContext context)
		{
			_context = context;
		}

		[HttpGet]
		public async Task<IActionResult> Index()
		{
			List<Todo> list = await _context.Todo.ToListAsync();
			return Json(list);
		}

		// POST: Todo/Create
		// To protect from overposting attacks, enable the specific properties you want to bind to, for
		// more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Create([Bind("Id,Task,Done")] Todo todo)
		{
			DateTime now = DateTime.Now;
			if (ModelState.IsValid)
			{
				todo.CreatedAt = now;
				todo.UpdatedAt = now;
				_context.Add(todo);
				await _context.SaveChangesAsync();
				return RedirectToAction(nameof(Index));
			}
			return Json(todo);
		}

		// POST: Todo/Update/5
		// To protect from overposting attacks, enable the specific properties you want to bind to, for
		// more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
		[HttpPost]
		[ValidateAntiForgeryToken]
		public async Task<IActionResult> Update(int id, [Bind("Id,Task,Done")] Todo todo)
		{
			if (id != todo.Id)
			{
				return NotFound();
			}
			todo.UpdatedAt = DateTime.Now;
			if (ModelState.IsValid)
			{
				try
				{
					_context.Update(todo);
					await _context.SaveChangesAsync();
				}
				catch (DbUpdateConcurrencyException)
				{
					if (!TodoExists(todo.Id))
					{
						return NotFound();
					}
					else
					{
						throw;
					}
				}
				return Ok();
			}
			return BadRequest();
		}

		// DELETE: Todo/Delete/5
		public async Task<IActionResult> Delete(int? id)
		{
			if (id == null)
			{
				return NotFound();
			}

			var todo = await _context.Todo
					.FirstOrDefaultAsync(m => m.Id == id);
			if (todo == null)
			{
				return NotFound();
			}

			return Ok();
		}

		// POST: Todo/Delete/5
		[HttpPost, ActionName("Delete")]
		public async Task<IActionResult> DeleteConfirmed(int id)
		{
			var todo = await _context.Todo.FindAsync(id);
			if (todo == null) {
				return NotFound();
			}

			try {
				_context.Todo.Remove(todo);
				await _context.SaveChangesAsync();

				return Ok();
			} catch (Exception e) {
				throw;
			}

		}

		private bool TodoExists(int id)
		{
			return _context.Todo.Any(e => e.Id == id);
		}
	}
}
