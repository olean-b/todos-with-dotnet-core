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
	[Produces("application/json")]
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
			List<Todo> list = await _context.Todo.OrderByDescending((t => t.UpdatedAt)).ToListAsync();
			return Json(list);
		}

		// POST: Todo/Create
		[HttpPost]
		public async Task<IActionResult> Create([FromBody] Todo todo)
		{
			DateTime now = DateTime.Now;
			if (ModelState.IsValid)
			{
				todo.CreatedAt = now;
				todo.UpdatedAt = now;
				todo.Done = false;
				_context.Add(todo);
				await _context.SaveChangesAsync();
				return Json(todo);
			}

			return BadRequest();
		}

		// PATHC: Todo/Update/5
		// To protect from overposting attacks, enable the specific properties you want to bind to, for
		// more details, see http://go.microsoft.com/fwlink/?LinkId=317598.
		[HttpPatch("{id}")]
		public async Task<IActionResult> Update(int id, [FromBody] Todo todo)
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
					return Ok(todo);
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
			}
			return BadRequest();
		}

		// POST: Todo/Delete/5
		[HttpDelete("{id}")]
		public async Task<IActionResult> Delete(int id)
		{
			var todo = await _context.Todo.FindAsync(id);

			try
			{
				_context.Todo.Remove(todo);
				await _context.SaveChangesAsync();

				return Ok();
			}
			catch (Exception e)
			{
				throw e;
			}

		}

		private bool TodoExists(int id)
		{
			return _context.Todo.Any(e => e.Id == id);
		}
	}
}
